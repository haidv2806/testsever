import express, { json, response} from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt, { hash } from "bcrypt"
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2"
import session from "express-session";
import env from "dotenv";
import nodemailer from "nodemailer";
import multer from "multer";
import mammoth from "mammoth";
import WordExtractor from"word-extractor"
// import { assign } from "nodemailer/lib/shared";
// import axios from "axios";

// sử dụng express, tạo cổng, tạo số lần sử dụng bcrypt, kết nối .evn
const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

// ghi địa chỉ thư mục làm bộ nhớ tạm để tạo sản phẩm mới
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
})

const upload = multer({ storage: storage })


// sử dụng bodyparser và express cho foder public
// app.use(express.json());
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

const { Pool } = pg;
// liên kết với cơ sở dữ liệu
const db = new Pool({
  // user: process.env.PG_USER,
  // host: process.env.PG_HOST,
  // database: process.env.PG_DATABASE,
  // password: process.env.PG_PASSWORD,
  // port: process.env.PG_PORT,
  connectionString: process.env.POSTGRES_URL,
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


//kiểm tra sản phẩm dựa trên giá người dùng chọn
async function checkPRODUCT(minPrice, maxPrice, product_name, product_brand, product_series, product_name_search, userid) {
  let query;
  let params = [];
  const other = 'other';

  if (product_name_search && minPrice && maxPrice) {
    query = "SELECT * FROM product WHERE price BETWEEN $1 AND $2 AND UPPER(name) LIKE UPPER($3)";
    params.push(minPrice, maxPrice, `%${product_name_search}%`);
  } else if (minPrice && maxPrice) {
    query = "SELECT * FROM product WHERE price BETWEEN $1 AND $2";
    params.push(minPrice, maxPrice);
  } else if (product_name_search) {
    query = "SELECT * FROM product WHERE UPPER(name) LIKE UPPER($1)";
    params.push(`%${product_name_search}%`);
  } else if (product_name) {
    query = "SELECT * FROM product WHERE UPPER(name) = UPPER($1)";
    params.push(`${product_name}`);
  } else if (product_brand == other) {
    query = "SELECT * FROM product WHERE brand = 'Sony' OR brand = 'LG' OR brand = 'Google' ";
  } else if (product_brand){
    query = "SELECT * FROM product WHERE UPPER(brand) LIKE UPPER($1)";
    params.push(`%${product_brand}%`);
  } else if (product_series){
    query = "SELECT product.productid, product.image, product.brand, product.name, product.price FROM product INNER JOIN productdetail ON product.productid = productdetail.productid WHERE UPPER(series) LIKE UPPER($1)";
    params.push(`%${product_series}%`);
  } else {
    query = "SELECT * FROM product";
  }

  const result = await db.query(query, params);

  let productID =[];
  let productIMG = [];
  let productBRAND = [];
  let productNAME =[];
  let productPRICE = [];
  let productHEART = [];

  result.rows.forEach((row) => {
    productID.push(row.productid);
    productIMG.push(row.image);
    productBRAND.push(row.brand);
    productNAME.push(row.name);
    productPRICE.push(row.price.toLocaleString('vi', {style : 'currency', currency : 'VND'}));
  });

    for (let i = 0; i < productID.length; i++) {
      productHEART.push( await checkHEART(userid,productID[i]))
    }

  return [
    productID, 
    productIMG, 
    productNAME, 
    productPRICE, 
    productBRAND, 
    productHEART
  ];
}

//kiểm tra sản phẩm yêu thích của người dùng
async function checkUSER_fav(id) {
  const result = await db.query("SELECT product.productid, product.image, product.brand, product.name, product.price, user_fav.number FROM user_fav INNER JOIN product ON user_fav.productid = product.productid INNER JOIN users ON user_fav.userid = users.userid WHERE user_fav.userid = $1",
                                [id]);
  let productID =[];
  let productIMG = [];
  let productBRAND = [];
  let productNAME =[];
  let productPRICE = [];
  let productFAVNUMBER = [];

  result.rows.forEach((row) => {
    productID.push(row.productid);
    productIMG.push(row.image);
    productBRAND.push(row.brand);
    productNAME.push(row.name);
    productPRICE.push(row.price.toLocaleString('vi', {style : 'currency', currency : 'VND'}));
    productFAVNUMBER.push(row.number);
  });

  return [productID, productIMG, productNAME, productPRICE, productBRAND, productFAVNUMBER];
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
  let productSERIES = [];
  let productID =[];
  let productDESCRIPTION = [];

  result.rows.forEach((row) => {
    productID.push(row.productid);
    productIMG1.push(row.image1);
    productIMG2.push(row.image2);
    productIMG3.push(row.image3);
    productIMG4.push(row.image4);
    productBRAND.push(row.brand);
    productSERIES.push(row.series)
    productNAME.push(row.name);
    productPRICE.push(row.price.toLocaleString('vi', {style : 'currency', currency : 'VND'}));
    productDESCRIPTION.push(row.description);
  });

  return [
    productID, 
    productIMG1, 
    productIMG2, 
    productIMG3, 
    productIMG4, 
    productBRAND, 
    productNAME, 
    productPRICE, 
    productDESCRIPTION, 
    productSERIES
  ];
};

// đưa ra toàn bộ sản phẩm mà không cần item
async function checkPRODUCT_DETAIL_FOR_ADMIN() {
  const result = await db.query("SELECT *  FROM productdetail");
  let productIMG1 = [];
  let productIMG2 = [];
  let productIMG3 = [];
  let productIMG4 = [];
  let productNAME =[];
  let productPRICE = [];
  let productBRAND = [];
  let productSERIES = [];
  let productID =[];
  let productDESCRIPTION = [];

  result.rows.forEach((row) => {
    productID.push(row.productid);
    productIMG1.push(row.image1);
    productIMG2.push(row.image2);
    productIMG3.push(row.image3);
    productIMG4.push(row.image4);
    productBRAND.push(row.brand);
    productSERIES.push(row.series)
    productNAME.push(row.name);
    productPRICE.push(row.price.toLocaleString('vi', {style : 'currency', currency : 'VND'}));
    productDESCRIPTION.push(row.description);
  });

  return [
    productID, 
    productIMG1, 
    productIMG2, 
    productIMG3, 
    productIMG4, 
    productBRAND, 
    productNAME, 
    productPRICE, 
    productDESCRIPTION, 
    productSERIES
  ];
};

//kiểm tra tổng giá trị sản phẩm
async function checkPRICE(userid, fav_product_id) {
  let PRICE = 0;
  let fav_product_price_per_product = [];
  let price = 0;
  let tong = 0; 
  let SALE = 0;
  let totalamount = 0;
  const sale = await check_USER_SALE(userid);

  for (let i = 0; i < fav_product_id.length; i++) {
    const fav_product = fav_product_id[i];
    const result = await db.query("SELECT product.price, user_fav.number FROM product inner join user_fav ON product.productid = user_fav.productid WHERE userid = $1 AND user_fav.productid = $2", 
    [userid, fav_product]);
    let productPRICE = [];
    let number = [];
    result.rows.forEach((row) => {
      productPRICE.push(row.price);
      number.push(row.number);
    });
    price = productPRICE[0]*number[0];
    fav_product_price_per_product.push(price.toLocaleString('vi', {style : 'currency', currency : 'VND'}));
  };

  for (let i = 0; i < fav_product_id.length; i++) {
    const fav_product = fav_product_id[i];
    const result = await db.query("SELECT product.price, user_fav.number FROM product inner join user_fav ON product.productid = user_fav.productid WHERE userid = $1 AND user_fav.productid = $2", 
    [userid, fav_product]);
    let productPRICE = [];
    let number = [];
    result.rows.forEach((row) => {
      productPRICE.push(row.price);
      number.push(row.number);
    });
    PRICE = PRICE + productPRICE[0]*number[0];
  };

    SALE = PRICE * (sale / 100);
    totalamount = PRICE - SALE;

    PRICE = PRICE.toLocaleString('vi', {style : 'currency', currency : 'VND'});
    SALE = SALE.toLocaleString('vi', {style : 'currency', currency : 'VND'});
    totalamount = totalamount.toLocaleString('vi', {style : 'currency', currency : 'VND'});

  for (let i = 0; i < fav_product_id.length; i++) {
    const fav_product = fav_product_id[i];
    const result = await db.query("SELECT product.price, user_fav.number FROM product inner join user_fav ON product.productid = user_fav.productid WHERE userid = $1 AND user_fav.productid = $2", 
    [userid, fav_product]);
    let productPRICE = [];
    let number = [];
    result.rows.forEach((row) => {
      productPRICE.push(row.price);
      number.push(row.number);
    });
    tong = tong + number[0];
  };

  return [
    fav_product_price_per_product, 
    PRICE, 
    tong,
    SALE,
    totalamount
  ];
}

//kiểm tra địa chỉ người dùngngườidùng
async function checkADDRESS(user_id) {
  let name = [];
  let phone_number = [];
  let home_address = [];
  let district_address = [];

  const result = await db.query("SELECT * FROM user_address WHERE userid = $1", [user_id])

  result.rows.forEach((row) => {
    name.push(row.name);
    phone_number.push(row.phonenumber);
    home_address.push(row.homeaddress);
    district_address.push(row.districtaddress);
  });

  return [
    name, 
    phone_number, 
    home_address, 
    district_address
  ];
}

//gửi email thông báo đã mua hàng
async function send_BUYED_EMAIL(user_email, products, numbers) {
  let productsContent = '';
  for (let i = 0; i < products.length; i++) {
    productsContent += `${products[i]} x ${numbers[i]} \n`;
  }

  let transporter = nodemailer.createTransport({
    host: "live.smtp.mailtrap.io",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    }
  });

  let info = await transporter.sendMail({
    from: "didonghigh-tech@demomailtrap.com",
    to: user_email,
    subject: "cảm ơn bạn đã mua hàng tại Di Động High-Tech",
    text: `
    Các sản phẩm của bạn đã được đóng gói:
    Các sản phẩm trong đơn hàng của bạn đã được đóng gói và giao
    cho đơn vị vận chuyển. Bạn vui lòng đợi nhà vận chuyển cập nhật trạng thái
    giao hàng trong thời gian tới
    Các sản phẩm đang được đóng gói:
    ${productsContent}`,
  });

  console.log("Message sent: %s", info.messageId);
}

//thay đổi mật khẩu cho người dùng quên mật khẩu
async function send_FORGET_PASSWORD(user_email) {

  let transporter = nodemailer.createTransport({
    host: "live.smtp.mailtrap.io",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    }
  });

  let info = await transporter.sendMail({
    from: "didonghigh-tech@demomailtrap.com",
    to: user_email,
    subject: "bạn đang có yêu cầu lấy lại mật khẩu tại Di Động High-Tech",
    text: `
    mật khẩu mới tạm thời cảu bạn là "Haidv2806"
    Hãy đăng nhập vào web và sử dụng mật khẩu này rồi thay đổi mật khẩu
    tại profile của mình!`,
  });

  console.log("Message sent: %s", info.messageId);
}

//đổi password
async function change_password(email, password_1) {
  bcrypt.hash(password_1, saltRounds, async (err, hash) => {
    if (err) {
      console.error("error hashing password:", err);
    } else {
      const result = await db.query("UPDATE users SET password = $1 WHERE email = $2  RETURNING *",
      [hash, email])
    }
  });
}

//tạo đơn hàng
async function createORDER(email, products, numbers, phonenumber, totalamount, districtaddress, homeaddress) {
  let orderProduct = '';
  for (let i = 0; i < products.length; i++) {
    orderProduct += `${products[i]} x ${numbers[i]};`;
  }


  // Lấy ngày, tháng và năm
  var currentDate = new Date();

  var day = currentDate.getDate();
  var month = currentDate.getMonth() + 1; // Tháng bắt đầu từ 0 nên cần cộng thêm 1
  var year = currentDate.getFullYear();

  const orderdate = day + '/' + month + '/' + year;

  const result = await db.query("INSERT INTO orders (useremail, orderproduct, orderdate, totalamount, phonenumber, districtaddress, homeaddress, Status) VALUES ($1,$2,$3,$4,$5,$6,$7, $8)",
                                [email, orderProduct, orderdate, totalamount, phonenumber[0], districtaddress[0], homeaddress[0], 'đang chuẩn bị hàng'])
}

// kiểm tra đơn hàng
async function checkORDER() {
  const result = await db.query("SELECT * FROM orders")

  let orderID = [];
  let email = [];
  let orderPRODUCT = [];
  let orderDATE = [];
  let totalamount = [];
  let phone_number = [];
  let district_address = [];
  let home_address = [];
  let status = [];

  result.rows.forEach((row) => {
    orderID.push(row.orderid);
    email.push(row.useremail);
    orderPRODUCT.push(row.orderproduct);
    orderDATE.push(row.orderdate);
    totalamount.push(row.totalamount.toLocaleString('vi', {style : 'currency', currency : 'VND'}));
    phone_number.push(row.phonenumber);
    district_address.push(row.districtaddress);
    home_address.push(row.homeaddress);
    status.push(row.status);
  });

  return [
    orderID,
    email,
    orderPRODUCT,
    orderDATE,
    totalamount,
    phone_number,
    district_address,
    home_address,
    status
  ];
}

//xoá các sản phẩm đã yêu thích.
async function DELETE_FAV_PRODUCT(userid) {
  const result = await db.query("DELETE FROM user_fav WHERE userid = $1", [userid])
}

//xoá các sản phẩm mà admin muốn xoá
async function DELETE_PRODUCT(productid) {
  const result = await db.query("DELETE FROM product WHERE procuctid = $1", [productid]);
  const result2 = await db.query("DELETE FROM productdetail WHERE procuctid = $1", [productid])
}

//kiểm tra sale của user
async function check_USER_SALE(userid) {
  const result = await db.query("SELECT userid, email, usersale FROM users WHERE userid = $1",[userid])

  let sale = [];

  result.rows.forEach((row) =>{
    sale.push(row.usersale)
  });

  return[
    sale
  ]
}

//kiểm tra sale của tất cả user
async function check_USER_SALE_ADMIN() {
  const result = await db.query("SELECT userid, email, usersale FROM users")

  let userid = [];
  let email = [];
  let sale = [];

  result.rows.forEach((row) => {
    userid.push(row.userid);
    email.push(row.email);
    sale.push(row.usersale)
  });

  return [
    userid,
    email,
    sale
  ]
}

//tìm kiếm sản phẩm dựa trên giá
app.get("/", async (req, res) => {
  const minPrice = req.query.minPrice;
  const maxPrice = req.query.maxPrice;
  const product_name = req.query.product_name;
  const product_brand = req.query.product_brand;
  const product_series = req.query.product_series;
  const product_name_search = req.query.product_name_search;

  // lấy thông tin chi tiết sản phẩm 
  const [productID,productIMG,productNAME,productPRICE,productBRAND,] =await checkPRODUCT(minPrice, maxPrice, product_name, product_brand, product_series, product_name_search,);

  // kiểm tra xem có người dùng đăng nhập không?
  const check = req.isAuthenticated();
  const profile = req.user;
  if (profile) {
    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    const [,,,,,productHEART] = await checkPRODUCT(minPrice, maxPrice, product_name, product_brand, product_series, id);

    // lấy ra thông tin chi tiết sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand,] = await checkUSER_fav(id);

    //kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price,tong,sale, totalamount] = await checkPRICE(id, fav_product_id);

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
        fav_product_name: fav_product_name,
        fav_product_price: fav_product_price,
        fav_product_brand: fav_product_brand,
        price: price,
        sale: sale,
        totalamount: totalamount,
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
  const [productID,productIMG1,productIMG2,productIMG3,productIMG4,productBRAND,productNAME,productPRICE,productDESCRIPTION,productSERIES] =await checkPRODUCT_DETAIL(item);

  // xem sét xem có người dùng đăng nhập không?
  const check = req.isAuthenticated();
  const profile = req.user;
  if (profile) {
    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết của sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand,] = await checkUSER_fav(id);
    // const [,fav_product_img,,,] = await checkUSER_fav(id);

    const productHEART = await checkHEART(id, item);
    console.log(productHEART);

    //kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price, tong, sale, totalamount] = await checkPRICE(id, fav_product_id);


    res.render("product-detail.ejs", {
      product_id: productID,
      product_img1: productIMG1,
      product_img2: productIMG2,
      product_img3: productIMG3,
      product_img4: productIMG4,
      product_name: productNAME,
      product_price: productPRICE,
      product_brand: productBRAND,
      product_series: productSERIES,
      product_description: productDESCRIPTION,

      product_heart: productHEART,

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
      sale: sale,
      totalamount: totalamount,
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
      product_series: productSERIES,
      product_description: productDESCRIPTION,
      product_heart: 0,
      check: check,
    });
  }
});

app.get("/favourite", async (req, res) => {
  const check = req.isAuthenticated();

  if (check) {
    const profile = req.user;

    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết của sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand, fav_product_number] = await checkUSER_fav(id);

    //kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price, tong, sale, totalamount] = await checkPRICE(id, fav_product_id);


    res.render("favourite.ejs", {
      check: check,
      email: email,
      user_name: displayname,
      picture: picture,

      fav_product_id: fav_product_id,
      fav_product_img: fav_product_img,
      fav_product_name: fav_product_name,
      fav_product_price: fav_product_price,
      fav_product_brand: fav_product_brand,
      fav_product_number: fav_product_number,
      fav_product_price_per_product: fav_product_price_per_product,
      price: price,
      sale: sale,
      totalamount: totalamount,
    });
  } else {
      res.redirect("/");
  }
});


app.get("/checkout", async (req, res) => {
  const check = req.isAuthenticated();

  if (check) {
    const profile = req.user;

    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết của sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand, fav_product_number] = await checkUSER_fav(id);
   
    //kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price, tong, sale, totalamount] = await checkPRICE(id, fav_product_id);


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
      fav_product_number: fav_product_number,
      fav_product_price_per_product: fav_product_price_per_product,
      tong: tong,
      price: price,
      sale: sale,
      totalamount: totalamount,
    });
  } else {
    res.redirect("/");
  }

})

app.get("/delivery", async (req,res) => {
  const check = req.isAuthenticated();

  if (check) {
    const profile = req.user;

    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    //lấy ra thông tin địa chỉ người dùng
    const [name, phone_number, home_address, district_address] = await checkADDRESS(id)

    // lấy ra thông tin chi tiết của sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand, fav_product_number] = await checkUSER_fav(id);
   
    // kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price, tong, sale, totalamount] = await checkPRICE(id, fav_product_id);


    res.render("delivery.ejs", {
      check: check,
      email: email,
      user_name: displayname,
      picture: picture,

      name: name,
      phone_number: phone_number,
      home_address: home_address,
      district_address: district_address,

      fav_product_id: fav_product_id,
      fav_product_img: fav_product_img,
      fav_product_name: fav_product_name,
      fav_product_price: fav_product_price,
      fav_product_brand: fav_product_brand,
      fav_product_number: fav_product_number,
      fav_product_price_per_product: fav_product_price_per_product,
      tong: tong,
      price: price,
      sale: sale,
      totalamount: totalamount,
    });
  } else {
    res.redirect("/")
  }
})

app.get("/payment", async (req, res) => {
  const check = req.isAuthenticated();

  if (check) {
    const profile = req.user;

    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    //lấy ra thông tin địa chỉ người dùng
    const [name, phone_number, home_address, district_address] = await checkADDRESS(id)
    
    // lấy ra thông tin chi tiết của sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand] = await checkUSER_fav(id);
   
    //kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price, tong, sale, totalamount] = await checkPRICE(id, fav_product_id);


    res.render("payment.ejs", {
      check: check,
      email: email,
      user_name: displayname,
      picture: picture,

      name: name,
      phone_number: phone_number,
      home_address: home_address,
      district_address: district_address,

      fav_product_id: fav_product_id,
      fav_product_img: fav_product_img,
      fav_product_name: fav_product_name,
      fav_product_price: fav_product_price,
      fav_product_brand: fav_product_brand,
      tong: tong,
      price: price,
      sale: sale,
      totalamount: totalamount,
    });
  } else {
      res.redirect("/");
  }
})

app.get("/profile", async (req, res) => {
  const check = req.isAuthenticated();

  if (check) {
    const profile = req.user;

    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    //lấy ra thông tin địa chỉ người dùng
    const [name, phone_number, home_address, district_address] = await checkADDRESS(id)
    
    // lấy ra thông tin chi tiết của sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand, fav_product_number] = await checkUSER_fav(id);

    // kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price, tong, sale, totalamount] = await checkPRICE(id, fav_product_id);


    res.render("profile.ejs", {
      check: check,
      email: email,
      user_name: displayname,
      picture: picture,

      name: name,
      phone_number: phone_number,
      home_address: home_address,
      district_address: district_address,

      fav_product_id: fav_product_id,
      fav_product_img: fav_product_img,
      fav_product_name: fav_product_name,
      fav_product_price: fav_product_price,
      fav_product_brand: fav_product_brand,
      price: price,
      sale: sale,
      totalamount: totalamount,
    });
  } else {
      res.redirect("/");
  }
})

app.get("/send_email", async (req, res) => {
  const check = req.isAuthenticated();

  if (check) {
    const profile = req.user;

    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    //lấy ra thông tin địa chỉ người dùng
    const [name, phone_number, home_address, district_address] = await checkADDRESS(id)
    
    // lấy ra thông tin chi tiết của sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand, fav_product_number] = await checkUSER_fav(id);

    // kiểm tra giá sản phẩm
    let PRICE = 0;

    for (let i = 0; i < fav_product_id.length; i++) {
      const fav_product = fav_product_id[i];
      const result = await db.query("SELECT product.price, user_fav.number FROM product inner join user_fav ON product.productid = user_fav.productid WHERE userid = $1 AND user_fav.productid = $2", 
      [id, fav_product]);
      let productPRICE = [];
      let number = [];
      result.rows.forEach((row) => {
        productPRICE.push(row.price);
        number.push(row.number);
      });
      PRICE = PRICE + productPRICE[0]*number[0];
    };

    const price = PRICE;

    //tạo đơn hàng mới
    const createorder = await createORDER(email, fav_product_name, fav_product_number, phone_number, price, district_address, home_address)
    
    const delete_fav_product = await DELETE_FAV_PRODUCT(id)
    //gửi email đơn hàng cho người dùng
    // const send_email = await send_BUYED_EMAIL(email, fav_product_name, fav_product_number)
    res.redirect("/profile")
  } else {
      res.redirect("/");
  }
})

app.get("/news", async (req, res) => {
  const check = req.isAuthenticated();
  if (check) {
    const profile = req.user;
    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand,] = await checkUSER_fav(id);


    //kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price, tong, sale, totalamount] = await checkPRICE(id, fav_product_id);

    res.render("news.ejs", {
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
      sale: sale,
      totalamount: totalamount,
    })
  } else {
    res.render("news.ejs", {
      check: check,
    })
  }
})

app.get("/hotdeal_child_xiaomi", async (req, res) => {
  const check = req.isAuthenticated();
  if (check) {
    const profile = req.user;
    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand,] = await checkUSER_fav(id);


    //kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price, tong, sale, totalamount] = await checkPRICE(id, fav_product_id);
    
    res.render("hotdeal_child_xiaomi.ejs", {
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
      sale: sale,
      totalamount: totalamount,
    })
  } else {
    res.render("hotdeal_child_xiaomi.ejs", {
      check: check,
    })
  }
})

app.get("/hotdeal_child_samsung", async (req, res) => {
  const check = req.isAuthenticated();
  if (check) {
    const profile = req.user;
    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand,] = await checkUSER_fav(id);


    //kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price, tong, sale, totalamount] = await checkPRICE(id, fav_product_id);
    
    res.render("hotdeal_child_samsung.ejs", {
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
      sale: sale,
      totalamount: totalamount,
    })
  } else {
    res.render("hotdeal_child_samsung.ejs", {
      check: check,
    })
  }
})

app.get("/hotdeal_child_oppo", async (req, res) => {
  const check = req.isAuthenticated();
  if (check) {
    const profile = req.user;
    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand,] = await checkUSER_fav(id);


    //kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price, tong, sale, totalamount] = await checkPRICE(id, fav_product_id);
    
    res.render("hotdeal_child_oppo.ejs", {
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
      sale: sale,
      totalamount: totalamount,
    })
  } else {
    res.render("hotdeal_child_oppo.ejs", {
      check: check,
    })
  }
})

app.get("/hotdeal_child_iphone", async (req, res) => {
  const check = req.isAuthenticated();
  if (check) {
    const profile = req.user;
    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand,] = await checkUSER_fav(id);


    //kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price, tong, sale, totalamount] = await checkPRICE(id, fav_product_id);
    
    res.render("hotdeal_child_iphone.ejs", {
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
      sale: sale,
      totalamount: totalamount,
    })
  } else {
    res.render("hotdeal_child_iphone.ejs", {
      check: check,
    })
  }
})

app.get("/hotdeal", async (req, res) => {
  const check = req.isAuthenticated();
  if (check) {
    const profile = req.user;
    const id = profile.userid;
    const email = profile.email;
    const displayname = profile.displayname;
    const picture = profile.picture;

    // lấy ra thông tin chi tiết sản phẩm yêu thích
    const [fav_product_id,fav_product_img,fav_product_name,fav_product_price,fav_product_brand,] = await checkUSER_fav(id);


    //kiểm tra giá sản phẩm
    const [fav_product_price_per_product, price, tong, sale, totalamount] = await checkPRICE(id, fav_product_id);
    
    res.render("hotdeal.ejs", {
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
      sale: sale,
      totalamount: totalamount,
    })
  } else {
    res.render("hotdeal.ejs", {
      check: check,
    })
  }
})


app.get("/webadmin_home", async (req, res) => {
  const checking = req.isAuthenticated();
if (checking) {
  const check = req.user.email;
  if (check == process.env.ADMIN) {
    //kiểm tra đơn hàng
    const [orderID, email, orderPRODUCT, orderDATE, totalamount, phone_number, district_address, home_address, status] = await checkORDER();
    res.render("webadmin-home.ejs", {
      orderid: orderID,
      email: email,
      order_product: orderPRODUCT,
      order_date: orderDATE,
      totalamount: totalamount,
      phone_number: phone_number,
      district_address: district_address,
      home_address: home_address,
      status: status,
    });
  } else {
    res.redirect("/webadmin_dangnhap")
  }
} else {
  res.redirect("/webadmin_dangnhap")
}
});

app.get("/webadmin_tonkho", async (req, res) => {
  const checking = req.isAuthenticated();
if (checking) {
  const check = req.user.email;
  if (check == process.env.ADMIN) {
  const [productID,productIMG1,productIMG2,productIMG3,productIMG4,productBRAND,productNAME,productPRICE,productDESCRIPTION,productSERIES] =await checkPRODUCT_DETAIL_FOR_ADMIN();
    res.render("webadmin-tonkho.ejs", {
      product_id: productID,
      product_img1: productIMG1,
      product_img2: productIMG2,
      product_img3: productIMG3,
      product_img4: productIMG4,
      product_name: productNAME,
      product_price: productPRICE,
      product_brand: productBRAND,
      product_series: productSERIES,
      product_description: productDESCRIPTION,
    });
  } else {
    res.redirect("/webadmin_dangnhap")
  }
} else {
  res.redirect("/webadmin_dangnhap")
}
});

app.get("/webadmin_dangnhap", async (req, res) => {
  res.render("webadmin-dangnhap.ejs", {

  });
});
app.get("/webadmin_uudai", async (req, res) => {
  const checking = req.isAuthenticated();
if (checking) {
  const check = req.user.email;
  if (check == process.env.ADMIN) {
    const [userid, email, sale] = await check_USER_SALE_ADMIN()
    res.render("webadmin-uudai.ejs", {
      user_id: userid,
      email: email,
      sale: sale
    });
  } else {
    res.redirect("/webadmin_dangnhap")
  }
} else {
  res.redirect("/webadmin_dangnhap")
}
});

app.get("delete_product", async (req, res) => {
  const item = req.query.id;
  const result = await DELETE_PRODUCT(item)
  res.redirect("webadmin_tonkho")
})

app.post("/webadmin_dang_nhap", 
  passport.authenticate("admin", {
    successRedirect: "/webadmin_home",
    failureRedirect: "/webadmin_dangnhap",
  })
);

app.get("/reset_password", async (req, res) => {
  res.render("reset-password.ejs")
})


app.get("/new_password", async (req, res) => {
  res.render("new-password.ejs")
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
  res.redirect('/?minPrice=' + minPrice + '&maxPrice=' + maxPrice +'&product_name_search=' + product_name);
});

app.post("/header_search", async (req,res) => {
  const product_name = req.body.text;
  console.log(product_name);
  res.redirect('/?product_name_search=' + product_name);
});

// taọ address cho người dùng dùn
app.post("/add_address", async (req, res) => {
  const name = req.body.name;
  const phone_number = req.body.phonenumber;
  const home_address = req.body.homeaddress;
  const district_address = req.body.districtaddress;
  const checkbox = req.body.checkbox;
  const user_id = req.user.userid;

  try {
    const result = await db.query("INSERT INTO  user_address VALUES ($1, $2, $3, $4, $5)",
    [user_id, name, phone_number,district_address,home_address]);

    res.redirect("/delivery");
  } catch (error) {
    console.log(err);
  }

});

// tạo sản phẩm yêu thích mới
app.post("/user_favourite", async (req, res) => {
  const check = req.isAuthenticated();
  if (check) {
    const product_id = req.body.product_id;
    // const product_id = req.params.product_id;
    console.log(product_id);
    const user_id = req.user.userid;
    console.log(user_id);
    const check = await checkHEART(user_id, product_id)

    if (check == 'like-btn--liked') {
      try {
        const result = await db.query("DELETE FROM user_fav WHERE userid = $1 AND productid = $2 RETURNING *",
        [user_id, product_id]);
        console.log("Xoá sản phẩm yêu thích thành công");
        try {
          return res.redirect(200 ,"/")
        } catch (error) {
          console.log(err);
        }
      } catch (err) {
        console.log(err);
        res.redirect("/");
      }
    } else {
      try {
        const result = await db.query("INSERT INTO user_fav VALUES ($1, $2, $3) RETURNING *",
        [user_id, product_id, 1]);
        console.log("tạo sản phẩm yêu thích thành công");
        try {
          return res.redirect(200 ,"/")
        } catch (error) {
          console.log(err);
        }
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
app.post("/user_favourite_plus", async (req, res) => {
  const check = req.isAuthenticated();
  if (check) {
    const product_id = req.body.product_id;
    const user_id = req.user.userid;
    try {
      const result = await db.query("UPDATE user_fav SET number = number + 1 WHERE userid = $1 AND productid = $2 RETURNING *",
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
  const product_id = req.body.product_id;
  const user_id = req.user.userid;
  let check = []
  const result = await db.query("SELECT number FROM user_fav WHERE userid = $1 AND productid = $2",
                                [user_id, product_id]
  )

  result.rows.forEach((row) => {
    check.push(row.number);
  })

  if (check[0] > 1) {
    try {
      const result = await db.query("UPDATE user_fav SET number = number - 1 WHERE userid = $1 AND productid = $2 RETURNING *",
      [user_id, product_id]);
      console.log("tạo sản phẩm yêu thích trừ 1 thành công thành công");
      res.redirect("/favourite");
    } catch (err) {
      console.log(err);
      res.redirect("/favourite");
    }
  } else {
    console.log("số lượng không được âm");
  }
});

//quên mật khẩu và đổi mật khẩu thành Haidv2806 đồng thời gửi email về cho người dùng
app.post("/forget_password", async (req, res) => {
  const email = req.body.email;

  const result = await send_FORGET_PASSWORD(email);
  const result2 = await change_password(email, "Haidv2806")
  res.redirect("/sign_in")
})

//thay đổi password của người dùng
app.post("/change_password", async (req, res) => {
  const check = req.isAuthenticated();

  if (check) {
    const email = req.user.email;
    const password_1 = req.body.password_1;
    const password_2 = req.body.password_2;

    if (password_1 == password_2) {
      const result = await change_password(email, password_1)
      res.redirect("/profile")
    } else {
      res.redirect("/new_passwoord");
      console.log("mật khẩu không giống nhau!");
    }
  } else {
    res.redirect("/")
  }
})

//thêm sản phẩm
app.post("/add_product", upload.single('description'), async (req, res) => {
  const img_1 = req.body.image_upload_1;
  const img_2 = req.body.image_upload_2;
  const img_3 = req.body.image_upload_3;
  const img_4 = req.body.image_upload_4;
  const brand = req.body.product_brand;
  const series = req.body.product_type;
  const name = req.body.product_name;
  const price = req.body.price;
  const description = req.file.description;

  mammoth.extractRawText({path: req.file.path})
  .then(function(result){
      var text = result.value;

      const extractor = new WordExtractor();
      const extracted = extractor.extract(req.file.path);
        extracted.then(async function(doc) { 

        const mota = doc.getBody()
        console.log(doc.getBody());
        
        const result2 = await db.query("INSERT INTO product (image, brand, name, price) VALUES ($1,$2,$3,$4) RETURNING *",
                                        [img_1, brand, name, price]);

        const productid = result2.rows.productid
        console.log(productid);
        const result3 = await db.query("INSERT INTO productdetail VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
                                        [productid, img_1, img_2, img_3, img_4, brand, series, name, price, mota])
      });

      var messages = result.messages;
      console.log(messages);
  })
  .catch(function(error) {
      console.error(error);
  });
  res.redirect("/webadmin_tonkho")
})

app.post("/add_sale", async (req,res) => {
  const email = req.body.email;
  const sale = req.body.sale;
  console.log(email);
  console.log(sale);

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (checkResult.rows.length > 0) {
      const result = await db.query("UPDATE users SET usersale = $1 WHERE email = $2",
                              [sale, email])
      res.redirect("/webadmin_uudai")
    } else {
      res.send('không có tài khoản trên!')
      res.redirect("/webadmin_uudai")
    }
  } catch (err) {
    console.log(err);
  }
})

// tạo tài khoản mới bằng email và mật khẩu
app.post("/sign_up", async (req, res) => {
  const email = req.body.email;
  const password_1 = req.body.password_1;
  const password_2 = req.body.password_2;
  console.log(email);
  console.log(password_1);
  console.log(password_2);
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
              const result = await db.query("INSERT INTO users (email, password, displayname, picture, usersale) VALUES ($1, $2, $3, $4, $5) RETURNING *",
              [email, hash, "user", "https://i.ibb.co/DL59hYp/image.png", 0]);
              const user = result.rows[0];
              req.login(user, (err) => {
                console.log(err);
                console.log("đăng ký thành công");
                res.redirect("/");
              });
            }
          });
        } else {
          res.redirect("/sign_up")
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

    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
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

// kiểm tra đang nhập bằng admin
passport.use(
  "admin",
  new Strategy(async function verify(username, password, cb) {
    if (username == process.env.ADMIN) {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
          username,
        ]);
        if (result.rows.length > 0) {
          const user = result.rows[0];
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
    } else {
      console.log("Không đúng admin");
      res.redirect("/webadmin_dangnhap")
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
            "INSERT INTO users (email, password, displayName, picture, usersale) VALUES ($1, $2, $3, $4, $5)",
            [profile.email, "google", profile.displayName, profile.picture, 0]
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