CREATE TABLE users(
    userid SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    displayname VARCHAR(50) NOT NULL,
    picture VARCHAR (100) NOT NULL,
    usersale INT NOT NULL
);

CREATE TABLE product(
    productid SERIAL PRIMARY KEY,
    image VARCHAR(100) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    price INT NOT NULL
);

CREATE TABLE productdetail(
    productid INT REFERENCES product(productid),
    image1 VARCHAR(100) NOT NULL,
    image2 VARCHAR(100) NOT NULL,
    image3 VARCHAR(100) NOT NULL,
    image4 VARCHAR(100) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    series VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    price INT NOT NULL,
    description text NOT NULL
);

CREATE TABLE user_fav(
    userid INT REFERENCES users(userid),
    productid INT REFERENCES product(productid),
    number INT NOT NULL
);

CREATE TABLE user_address (
    userid INT REFERENCES users(userid),
    name VARCHAR(50) NOT NULL,
    phonenumber INT NOT Null,
    districtaddress VARCHAR(50) NOT NULL,
    homeaddress VARCHAR(50) NOT Null
);

CREATE TABLE Orders (
    OrderID SERIAL PRIMARY KEY,
    useremail VARCHAR(50) NOT NULL,
    orderproduct VARCHAR (100) NOT NULL,
    OrderDate VARCHAR (50) NOT NULL,
    TotalAmount INT NOT NULL,
    phonenumber INT NOT NULL,
    districtaddress VARCHAR(150) NOT NULL,
    homeaddress VARCHAR(150)NOT NULL,
    Status VARCHAR(150) not NULL
);