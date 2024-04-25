import express, { json, response} from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt"
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2"
import session from "express-session";
import env from "dotenv";
// import axios from "axios";

const { Pool } = pg;
// sử dụng express, tạo cổng, tạo số lần sử dụng bcrypt, kết nối .evn
const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

// sử dụng bodyparser và express cho foder public
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// sử dụng cookie
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    }
  })
)

// sử dụng passport và session
app.use(passport.initialize());
app.use(passport.session());

// liên kết với cơ sở dữ liệu
const db = new Pool({
    // user: process.env.PG_USER,
    // host: process.env.PG_HOST,
    // database: process.env.PG_DATABASE,
    // password: process.env.PG_PASSWORD,
    // port: process.env.PG_PORT,
    connectionString: process.env.POSTGRES_URL ,
 });
  db.connect();


async function checkHEART(userid, productid) {
  const result = await db.query("SELECT * FROM user_fav WHERE userid = $1 AND productid = $2",
  [userid, productid]);
  // console.log(result);
  const check = result.rowCount;
  // console.log(check);
  if (check > 0) {
    return 'like-btn--liked';
  } else {
    return ;
  }
}

//kiểm tra sản phẩm trong cơ sở dữ liệu
// async function checkPRODUCT() {
//   const result = await db.query("SELECT *  FROM product");
//   let productID =[];
//   let productIMG = [];
//   let productBRAND = [];
//   let productNAME =[];
//   let productPRICE = [];

//   result.rows.forEach((id) => {
//     productID.push(id.productid);
//   })
//   result.rows.forEach((img) => {
//     productIMG.push(img.image);
//   });
//   result.rows.forEach((brand) => {
//     productBRAND.push(brand.brand)
//   })
//   result.rows.forEach((name) => {
//     productNAME.push(name.name);
//   });
//   result.rows.forEach((price) => {
//     productPRICE.push(price.price);
//   });
//   return [productID, productIMG, productNAME, productPRICE, productBRAND];
// };

//kiểm tra sản phẩm dựa trên giá người dùng chọn
async function checkPRODUCT(minPrice, maxPrice, product_name, userid) {
  let query;
  let params = [];

  if (product_name && minPrice && maxPrice) {
    query = "SELECT * FROM product WHERE price BETWEEN $1 AND $2 AND UPPER(brand) LIKE UPPER($3)";
    params.push(minPrice, maxPrice, `%${product_name}%`);
  } else if (minPrice && maxPrice) {
    query = "SELECT * FROM product WHERE price BETWEEN $1 AND $2";
    params.push(minPrice, maxPrice);
  } else if (product_name) {
    query = "SELECT * FROM product WHERE UPPER(brand) LIKE UPPER($1)";
    params.push(`%${product_name}%`);
  } else {
    query = "SELECT * FROM product";
  }

  const result = await db.query(query, params);

  let productID =[];
  let productIMG = [];
  let productBRAND = [];
  let productNAME =[];
  let productPRICE = [];
  let productHEART = []

  result.rows.forEach((row) => {
    productID.push(row.productid);
    productIMG.push(row.image);
    productBRAND.push(row.brand);
    productNAME.push(row.name);
    productPRICE.push(row.price);
  });

    for (let i = 0; i < productID.length; i++) {
      productHEART.push( await checkHEART(userid,productID[i]))
    }
    // console.log(productHEART);
    // const test = await checkHEART(userid,1);
    // console.log("tesst " + test);
  return [productID, productIMG, productNAME, productPRICE, productBRAND, productHEART];
}

//kiểm tra sản phẩm yêu thích của người dùng
// async function checkUSER_fav(id, productIMG) {
//   const result = await db.query("SELECT * FROM user_fav WHERE userid = $1", [id]);
//   let fav_productid =[];
//   let fav_productimg = []; 

//   result.rows.forEach((id) => {
//     fav_productid.push(id.productid);
//   });

//   const fav_product_id = fav_productid;
//   // console.log(fav_product_id);


//   for (i = 0; i < fav_product_id.length; i++){
//     fav_productimg.push(productIMG[fav_product_id[i]]);
//   }
//   const fav_product_img = fav_productimg;
//   // console.log(fav_product_img);

//   return [fav_product_id, fav_product_img]
// };

//kiểm tra sản phẩm yêu thích của người dùng
async function checkUSER_fav(id) {
  const result = await db.query("SELECT product.productid, product.image, product.brand, product.name, product.price FROM user_fav INNER JOIN product ON user_fav.productid = product.productid INNER JOIN users ON user_fav.userid = users.userid WHERE user_fav.userid = $1",
                                [id]);
  let productID =[];
  let productIMG = [];
  let productBRAND = [];
  let productNAME =[];
  let productPRICE = [];

  result.rows.forEach((row) => {
    productID.push(row.productid);
    productIMG.push(row.image);
    productBRAND.push(row.brand);
    productNAME.push(row.name);
    productPRICE.push(row.price);
  });

  return [productID, productIMG, productNAME, productPRICE, productBRAND];
};

// kiểm tra từng sản phẩm
async function checkPRODUCT_DETAIL(item) {
  const result = await db.query("SELECT *  FROM productdetail WHERE productid = $1", [item]);
  let productIMG1 = [];
  let productIMG2 = [];
  let productIMG3 = [];
  let productIMG4 = [];
  let productNAME =[];
  let productPRICE = [];
  let productBRAND = [];
  let productID =[];
  let productDESCRIPTION = [];

  result.rows.forEach((row) => {
    productID.push(row.productid);
    productIMG1.push(row.image1);
    productIMG2.push(row.image2);
    productIMG3.push(row.image3);
    productIMG4.push(row.image4);
    productBRAND.push(row.brand);
    productNAME.push(row.name);
    productPRICE.push(row.price);
    productDESCRIPTION.push(row.description);
  });

  return [productID, productIMG1, productIMG2, productIMG3, productIMG4, productBRAND, productNAME, productPRICE, productDESCRIPTION];
};

//kiểm tra tổng giá trị sản phẩm
async function checkPRICE(fav_product_id) {
  let PRICE = 0;

  for (let i = 0; i < fav_product_id.length; i++) {
    const fav_product = fav_product_id[i];
    const result = await db.query("SELECT price FROM product WHERE productid = $1", [fav_product]);
    let productPRICE = []
    result.rows.forEach((price) => {
      productPRICE.push(price.price);
    });
    PRICE = PRICE + productPRICE[0];
  };

  return PRICE;
}

// đưa ra product chính
// app.get("/", async (req, res) => {
//   // lấy thông tin chi tiết sản phẩm 
//   const [productID,,,,] =await checkPRODUCT();
//   const [,productIMG,,,] = await checkPRODUCT();
//   const [,,productNAME,,] = await checkPRODUCT();
//   const [,,,productPRICE,] = await checkPRODUCT();
//   const [,,,,productBRAND] = await checkPRODUCT();

//   // kiểm tra xem có người dùng đăng nhập không?
//   const check = req.isAuthenticated();
//   const profile = req.user;
//   if (profile) {
//     const id = profile.userid;
//     const email = profile.email;
//     const displayname = profile.displayname;
//     const picture = profile.picture;

//     // lấy ra thông tin chi tiết sản phẩm yêu thích
//     const [fav_product_id,,,,] = await checkUSER_fav(id, productIMG);
//     const [,fav_product_img,,,] = await checkUSER_fav(id, productIMG);
//     const price = await checkPRICE(fav_product_id);

//       res.render("index.ejs", {
//         product_id: productID,
//         product_img: productIMG,
//         product_name: productNAME,
//         product_price: productPRICE,
//         product_brand: productBRAND,
//         check: check,
//         email: email,
//         user_name: displayname,
//         picture: picture,
//         fav_product_id: fav_product_id,
//         fav_product_img: fav_product_img,
//         price: price,
//       });

//   } else {
//     res.render("index.ejs", {
//       product_id: productID,
//       product_img: productIMG,
//       product_name: productNAME,
//       product_price: productPRICE,
//       product_brand: productBRAND,
//       check: check,
//     });
//   }
  
// });




//tìm kiếm sản phẩm dựa trên giá
app.get("/", async (req, res) => {
  const minPrice = req.query.minPrice;
  const maxPrice = req.query.maxPrice;
  const product_name = req.query.product_name;

  // lấy thông tin chi tiết sản phẩm 
  const [productID,productIMG,productNAME,productPRICE,productBRAND,] =await checkPRODUCT(minPrice, maxPrice, product_name);

  // kiểm tra xem có người dùng đăng nhập không?
  const check = req.isAuthenticated();
  const profile = req.user;
  if (profile) {
    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    const [,,,,,productHEART] = await checkPRODUCT(minPrice, maxPrice, product_name, id);
    // console.log(productHEART);

    // lấy ra thông tin chi tiết sản phẩm yêu thích
    const [fav_product_id,fav_product_img,,,] = await checkUSER_fav(id, productIMG);
    // const [,fav_product_img,,,] = await checkUSER_fav(id, productIMG);
    const price = await checkPRICE(fav_product_id);

      res.render("index.ejs", {
        product_id: productID,
        product_img: productIMG,
        product_name: productNAME,
        product_price: productPRICE,
        product_brand: productBRAND,
        product_heart: productHEART,
        check: check,
        email: email,
        user_name: displayname,
        picture: picture,
        fav_product_id: fav_product_id,
        fav_product_img: fav_product_img,
        price: price,
      });

  } else {
    res.render("index.ejs", {
      product_id: productID,
      product_img: productIMG,
      product_name: productNAME,
      product_price: productPRICE,
      product_brand: productBRAND,
      product_heart: 0,
      check: check,
    });
  }
  
});

// đưa ra chi tiết từng sản phẩm
app.get("/product_detail", async (req, res) => {
  const item = req.query.id;


  // lấy thông tin chi tiết sản phẩm
  const [productID,productIMG1,productIMG2,productIMG3,productIMG4,productBRAND,productNAME,productPRICE,productDESCRIPTION] =await checkPRODUCT_DETAIL(item);
  // const [,productIMG1,,,,,,,] =await checkPRODUCT_DETAIL(item);
  // const [,,productIMG2,,,,,,] =await checkPRODUCT_DETAIL(item);
  // const [,,,productIMG3,,,,,] =await checkPRODUCT_DETAIL(item);
  // const [,,,,productIMG4,,,,] =await checkPRODUCT_DETAIL(item);
  // const [,,,,,productBRAND,,,] =await checkPRODUCT_DETAIL(item);
  // const [,,,,,,productNAME,,] =await checkPRODUCT_DETAIL(item);
  // const [,,,,,,,productPRICE,] =await checkPRODUCT_DETAIL(item);
  // const [,,,,,,,,productDESCRIPTION] =await checkPRODUCT_DETAIL(item);

  // xem sét xem có người dùng đăng nhập không?
  const check = req.isAuthenticated();
  const profile = req.user;
  if (profile) {
    const id = profile.id;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết của sản phẩm yêu thích
    const [fav_product_id,fav_product_img,,,] = await checkUSER_fav(id);
    // const [,fav_product_img,,,] = await checkUSER_fav(id);

    const price = await checkPRICE(fav_product_id);


    res.render("product-detail.ejs", {
      product_id: productID,
      product_img1: productIMG1,
      product_img2: productIMG2,
      product_img3: productIMG3,
      product_img4: productIMG4,
      product_name: productNAME,
      product_price: productPRICE,
      product_brand: productBRAND,
      product_description: productDESCRIPTION,
      check: check,
      email: email,
      user_name: displayname,
      picture: picture,
      fav_product_id: fav_product_id,
      fav_product_img: fav_product_img,
      price: price,
    });

  } else {
    res.render("product-detail.ejs", {
      product_id: productID,
      product_img1: productIMG1,
      product_img2: productIMG2,
      product_img3: productIMG3,
      product_img4: productIMG4,
      product_name: productNAME,
      product_price: productPRICE,
      product_brand: productBRAND,
      product_description: productDESCRIPTION,
      check: check,
    });
  }
});

app.get("/favourite", async (req, res) => {
  // const item = req.query.id;


  // lấy thông tin chi tiết sản phẩm
  // const [productID,,,,,,,,] =await checkPRODUCT_DETAIL(item);
  // const [,productIMG1,,,,,,,] =await checkPRODUCT_DETAIL(item);
  // const [,,productIMG2,,,,,,] =await checkPRODUCT_DETAIL(item);
  // const [,,,productIMG3,,,,,] =await checkPRODUCT_DETAIL(item);
  // const [,,,,productIMG4,,,,] =await checkPRODUCT_DETAIL(item);
  // const [,,,,,productBRAND,,,] =await checkPRODUCT_DETAIL(item);
  // const [,,,,,,productNAME,,] =await checkPRODUCT_DETAIL(item);
  // const [,,,,,,,productPRICE,] =await checkPRODUCT_DETAIL(item);
  // const [,,,,,,,,productDESCRIPTION] =await checkPRODUCT_DETAIL(item);

  // xem sét xem có người dùng đăng nhập không?
  const check = req.isAuthenticated();
  const profile = req.user;

    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết của sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand] = await checkUSER_fav(id);
    // const [,fav_product_img,,,] = await checkUSER_fav(id);
    // const [,,fav_product_name,,] = await checkUSER_fav(id);
    // const [,,,fav_product_price,] = await checkUSER_fav(id);
    // const [,,,,fav_product_brand] = await checkUSER_fav(id);

    const price = await checkPRICE(fav_product_id);


    res.render("favourite.ejs", {
      // product_id: productID,
      // product_img1: productIMG1,
      // product_img2: productIMG2,
      // product_img3: productIMG3,
      // product_img4: productIMG4,
      // product_name: productNAME,
      // product_price: productPRICE,
      // product_brand: productBRAND,
      // product_description: productDESCRIPTION,
      check: check,
      email: email,
      user_name: displayname,
      picture: picture,
      fav_product_id: fav_product_id,
      fav_product_img: fav_product_img,
      fav_product_name: fav_product_name,
      fav_product_price: fav_product_price,
      fav_product_brand: fav_product_brand,
      price: price,
    });
});


app.get("/checkout", async (req, res) => {
  const check = req.isAuthenticated();
  const profile = req.user;

    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết của sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand] = await checkUSER_fav(id);
   
    // const [fav_product_id,,,,] = await checkUSER_fav(id);
    // const [,fav_product_img,,,] = await checkUSER_fav(id);
    // const [,,fav_product_name,,] = await checkUSER_fav(id);
    // const [,,,fav_product_price,] = await checkUSER_fav(id);
    // const [,,,,fav_product_brand] = await checkUSER_fav(id);
    
    const price = await checkPRICE(fav_product_id);


    res.render("checkout.ejs", {
      check: check,
      email: email,
      user_name: displayname,
      picture: picture,
      fav_product_id: fav_product_id,
      fav_product_img: fav_product_img,
      fav_product_name: fav_product_name,
      fav_product_price: fav_product_price,
      fav_product_brand: fav_product_brand,
      price: price,
    });
})

app.get("/delivery", async (req,res) => {




  const check = req.isAuthenticated();
  const profile = req.user;

    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết của sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand] = await checkUSER_fav(id);
   
    // const [fav_product_id,,,,] = await checkUSER_fav(id);
    // const [,fav_product_img,,,] = await checkUSER_fav(id);
    // const [,,fav_product_name,,] = await checkUSER_fav(id);
    // const [,,,fav_product_price,] = await checkUSER_fav(id);
    // const [,,,,fav_product_brand] = await checkUSER_fav(id);
    
    const price = await checkPRICE(fav_product_id);


    res.render("delivery.ejs", {
      check: check,
      email: email,
      user_name: displayname,
      picture: picture,
      fav_product_id: fav_product_id,
      fav_product_img: fav_product_img,
      fav_product_name: fav_product_name,
      fav_product_price: fav_product_price,
      fav_product_brand: fav_product_brand,
      price: price,
    });
})

app.get("/payment", async (req, res) => {
  const check = req.isAuthenticated();
  const profile = req.user;

    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết của sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand] = await checkUSER_fav(id);
   
    // const [fav_product_id,,,,] = await checkUSER_fav(id);
    // const [,fav_product_img,,,] = await checkUSER_fav(id);
    // const [,,fav_product_name,,] = await checkUSER_fav(id);
    // const [,,,fav_product_price,] = await checkUSER_fav(id);
    // const [,,,,fav_product_brand] = await checkUSER_fav(id);
    
    const price = await checkPRICE(fav_product_id);


    res.render("payment.ejs", {
      check: check,
      email: email,
      user_name: displayname,
      picture: picture,
      fav_product_id: fav_product_id,
      fav_product_img: fav_product_img,
      fav_product_name: fav_product_name,
      fav_product_price: fav_product_price,
      fav_product_brand: fav_product_brand,
      price: price,
    });
})

app.get("reset_password", async (req, res) => {
  res.render("reset-password.ejs")
})

app.get("reset_password_emailed", async (req, res) => {
  res.render("reset_password_emailed.ejs")
})

app.get("/sign_up", async (req, res) => {
  res.render("sign-up.ejs")
});

app.get("/sign_in", async (req, res) => {
  res.render("sign-in.ejs")
});

// đăng nhập google
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// đường dẫn đăng nhập google
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/sign_in",
  })
);

// đăng xuất
app.get("/sign_out", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

//kiểm tra giá trị tìm kiếm của người dùng
app.post("/search", async (req,res) => {
  const minPrice = req.body.minPrice;
  const maxPrice = req.body.maxPrice;
  const product_name = req.body.text;
  console.log(product_name);
  res.redirect('/?minPrice=' + minPrice + '&maxPrice=' + maxPrice +'&product_name=' + product_name);
})

// tạo sản phẩm yêu thích mới
app.post("/user_favourite", async (req, res) => {
  const check = req.isAuthenticated();
  if (check) {
    const product_id = req.body.product_id;
    // const product_id = req.params.product_id;
    console.log(product_id);
    const user_id = req.user.userid;

    const check = await checkHEART(user_id, product_id)

    if (check == 'like-btn--liked') {
      try {
        const result = await db.query("DELETE FROM user_fav WHERE userid = $1 AND productid = $2 RETURNING *",
        [user_id, product_id]);
        console.log("Xoá sản phẩm yêu thích thành công");
        return res.redirect("/")
      } catch (err) {
        console.log(err);
        res.redirect("/");
      }
    } else {
      try {
        const result = await db.query("INSERT INTO user_fav VALUES ($1, $2, $3) RETURNING *",
        [user_id, product_id, 1]);
        console.log("tạo sản phẩm yêu thích thành công");
        return res.redirect("/")
      } catch (err) {
        console.log(err);
        res.redirect("/");
      }
    }
  } else {
    console.log("chưa đăng nhập người dùng");
  }
});

//thêm 1 sản phẩm yêu thích trong cơ sở dữ liệu
app.patch("/user_favourite_plus", async (req, res) => {
  const check = req.isAuthenticated();
  if (check) {
    const product_id = req.body.product_id;
    const user_id = req.user.userid;
    try {
      const result = await db.query("UPDATE user_fav SET number = number + 1 WHERE productid = $1 AND userid = $2 RETURNING *",
      [user_id, product_id]);
      console.log("tạo sản phẩm yêu thích thêm 1 thành công thành công");
      res.redirect("/favourite");
    } catch (err) {
      console.log(err);
      res.redirect("/favourite");
    }
  } else {
    console.log("chưa đăng nhập người dùng");
  }
});

//trừ đi 1 sản phẩm yêu thích trong cơ sở dữ liệu
app.post("/user_favourite_minus", async (req, res) => {
  const check = req.isAuthenticated();
  if (check) {
    const product_id = req.body.product_id;
    const user_id = req.user.userid;
    try {
      const result = await db.query("UPDATE user_fav SET number = number - 1 WHERE productid = $1 AND userid = $2 RETURNING *",
      [user_id, product_id]);
      console.log("tạo sản phẩm yêu thích trừ 1 thành công thành công");
      res.redirect("/favourite");
    } catch (err) {
      console.log(err);
      res.redirect("/favourite");
    }
  } else {
    console.log("chưa đăng nhập người dùng");
  }
});

// tạo tài khoản mới bằng email và mật khẩu
app.post("/sign_up", async (req, res) => {
  const email = req.body.username;
  const password_1 = req.body.password_1;
  const password_2 = req.body.password_2;
    try {
      const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      if (checkResult.rows.length > 0) {
        res.redirect("/sign_in");
        console.log("đã có tài khoản");
      } else {
        if (password_1 === password_2) {
          bcrypt.hash(password_1, saltRounds, async (err, hash) => {
            if (err) {
              console.error("error hashing password:", err);
            } else {
              const result = await db.query("INSERT INTO users (email, password, displayname, picture) VALUES ($1, $2, $3, $4) RETURNING *",
              [email, hash, "user", "https://i.ibb.co/DL59hYp/image.png"]);
              const user = result.rows[0];
              req.login(user, (err) => {
                console.log(err);
                console.log("đăng ký thành công");
                res.redirect("/");
              });
            }
          });
        } else {
          res.redirect("/sign_up",{
            // tao_tk_err: "mật khẩu phải giống nhau!",
          });
          console.log("mật khẩu không giống nhau");
        }
      }
    } catch (err) {
      console.log(err);
    }

});

app.post("/sign_in", 
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/sign_in",
  })
);

// đăng nhập bằng tài khoản và mật khẩu
passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    console.log(username)
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        console.log(user.picture);
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

// đăng nhập bằng google
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password, displayName, picture) VALUES ($1, $2, $3, $4)",
            [profile.email, "google", profile.displayName, profile.picture]
          );
          console.log("tạo tài khoản google thành công!");
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

// lưu trữ user
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});


// đưa ra cổng đang chạy
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});