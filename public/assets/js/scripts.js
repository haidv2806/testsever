// const $ = document.querySelector.bind(document);
// const $$ = document.querySelectorAll.bind(document);
// console.log($);
// console.log($$);
// console.log(document.querySelector);
// console.log("asdasda");
function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}
// Định nghĩa biến templateLoadedEvent trong tệp script JavaScript
// const templateLoadedEvent = "template-loaded";

// Sử dụng biến templateLoadedEvent để gửi sự kiện tới máy khách
// window.dispatchEvent(new Event(templateLoadedEvent));

// console.log(window.dispatchEvent(new Event("template-loaded")));
// console.log($$(".js-toggle"));

// window.addEventListener("template-loaded", handleActiveMenu);
// console.log(window.addEventListener("template-loaded", handleActiveMenu));

/**
 * Hàm tải template
 *
 * Cách dùng:
 * <div id="parent"></div>
 * <script>
 *  load("#parent", "./path-to-template.html");
 * </script>
 */
// function load(selector, path) {
//     const cached = localStorage.getItem(path);
//     if (cached) {
//         $(selector).innerHTML = cached;
//     }
//     // console.log(cached);
//     fetch(path)
//         .then((res) => res.text())
//         .then((html) => {
//             if (html !== cached) {
//                 $(selector).innerHTML = html;
//                 localStorage.setItem(path, html);
//             }
//         })
//         .finally(() => {
//             window.dispatchEvent(new Event("template-loaded"));
//         });
// }

/**
 * Hàm kiểm tra một phần tử
 * có bị ẩn bởi display: none không
 */
function isHidden(element) {
  if (!element) return true;

  if (window.getComputedStyle(element).display === "none") {
    return true;
  }

  let parent = element.parentElement;
  while (parent) {
    if (window.getComputedStyle(parent).display === "none") {
      return true;
    }
    parent = parent.parentElement;
  }

  return false;
}

/**
 * Hàm buộc một hành động phải đợi
 * sau một khoảng thời gian mới được thực thi
 */
function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}

/**
 * Hàm tính toán vị trí arrow cho dropdown
 *
 * Cách dùng:
 * 1. Thêm class "js-dropdown-list" vào thẻ ul cấp 1
 * 2. CSS "left" cho arrow qua biến "--arrow-left-pos"
 */
const calArrowPos = debounce(() => {
  if (isHidden($(".js-dropdown-list"))) return;

  const items = $$(".js-dropdown-list > li");

  items.forEach((item) => {
    const arrowPos = item.offsetLeft + item.offsetWidth / 2;
    item.style.setProperty("--arrow-left-pos", `${arrowPos}px`);
  });
});

function drop_down() {
  if (isHidden($(".js-dropdown-list"))) return;

  const items = $$(".js-dropdown-list > li");

  items.forEach((item) => {
    const arrowPos = item.offsetLeft + item.offsetWidth / 2;
    item.style.setProperty("--arrow-left-pos", `${arrowPos}px`);
  });
}

// Tính toán lại vị trí arrow khi resize trình duyệt
window.addEventListener("resize", calArrowPos);

// Tính toán lại vị trí arrow sau khi tải template
// window.addEventListener("template-loaded", calArrowPos);

/**
 * Giữ active menu khi hover
 *
 * Cách dùng:
 * 1. Thêm class "js-menu-list" vào thẻ ul menu chính
 * 2. Thêm class "js-dropdown" vào class "dropdown" hiện tại
 *  nếu muốn reset lại item active khi ẩn menu
 */
window.addEventListener("", handleActiveMenu);

function handleActiveMenu() {
  const dropdowns = $$(".js-dropdown");
  const menus = $$(".js-menu-list");
  const activeClass = "menu-column__item--active";

  const removeActive = (menu) => {
    menu.querySelector(`.${activeClass}`)?.classList.remove(activeClass);
  };

  const init = () => {
    menus.forEach((menu) => {
      const items = menu.children;
      if (!items.length) return;

      removeActive(menu);
      if (window.innerWidth > 991) items[0].classList.add(activeClass);

      Array.from(items).forEach((item) => {
        item.onmouseenter = () => {
          if (window.innerWidth <= 991) return;
          removeActive(menu);
          item.classList.add(activeClass);
        };
        item.onclick = () => {
          if (window.innerWidth > 991) return;
          removeActive(menu);
          item.classList.add(activeClass);
          item.scrollIntoView();
        };
      });
    });
  };

  init();

  dropdowns.forEach((dropdown) => {
    dropdown.onmouseleave = () => init();
  });
}

// function handleActiveMenu() {
//     const dropdowns = $$(".js-dropdown");
//     const menus = $$(".js-menu-list");
//     const activeClass = "menu-column__item--active";

//     const removeActive = (menu) => {
//         menu.querySelector(`.${activeClass}`)?.classList.remove(activeClass);
//     };

//     const init = () => {
//         menus.forEach((menu) => {
//             const items = menu.children;
//             if (!items.length) return;

//             removeActive(menu);
//             if (window.innerWidth > 991) items[0].classList.add(activeClass);

//             Array.from(items).forEach((item) => {
//                 item.onmouseenter = () => {
//                     if (window.innerWidth <= 991) return;
//                     removeActive(menu);
//                     item.classList.add(activeClass);
//                 };
//                 item.onclick = () => {
//                     if (window.innerWidth > 991) return;
//                     removeActive(menu);
//                     item.classList.add(activeClass);
//                     item.scrollIntoView();
//                 };
//             });
//         });
//     };

//     init();

//     dropdowns.forEach((dropdown) => {
//         dropdown.onmouseleave = () => init();
//     });
// }

// var menus = document.getElementsByClassName(".js-dropdown");
// console.log(menus);
// menus.addEventListener("mouseover", function(){
//     const dropdowns = $$(".js-dropdown");
//     const menus = $$(".js-menu-list");
//     const activeClass = "menu-column__item--active";

//     const removeActive = (menu) => {
//         menu.querySelector(`.${activeClass}`)?.classList.remove(activeClass);
//     };

//     const init = () => {
//         menus.forEach((menu) => {
//             const items = menu.children;
//             if (!items.length) return;

//             removeActive(menu);
//             if (window.innerWidth > 991) items[0].classList.add(activeClass);

//             Array.from(items).forEach((item) => {
//                 item.onmouseenter = () => {
//                     if (window.innerWidth <= 991) return;
//                     removeActive(menu);
//                     item.classList.add(activeClass);
//                 };
//                 item.onclick = () => {
//                     if (window.innerWidth > 991) return;
//                     removeActive(menu);
//                     item.classList.add(activeClass);
//                     item.scrollIntoView();
//                 };
//             });
//         });
//     };

//     init();

//     dropdowns.forEach((dropdown) => {
//         dropdown.onmouseleave = () => init();
//     });
// })

/**
 * JS toggle
 *
 * Cách dùng:
 * <button class="js-toggle" toggle-target="#box">Click</button>
 * <div id="box">Content show/hide</div>
 */
// window.addEventListener("template-loaded", initJsToggle);

document.addEventListener("DOMContentLoaded", function initJsToggle() {
  const button = document.getElementById("haha");
  const target = button.getAttribute("toggle-target");
  if (!target) {
    document.body.innerText = `Cần thêm toggle-target cho:  ${button.outerHTML}`;
  }
  button.onclick = (e) => {
    e.preventDefault();

    if (!$(target)) {
      return (document.body.innerText = `Không tìm thấy phần tử ${target}`);
    }
    const isHidden = $(target).classList.contains("hide");

    requestAnimationFrame(() => {
      $(target).classList.toggle("hide", !isHidden);
      $(target).classList.toggle("show", isHidden);
    });
  };
  document.onclick = function (e) {
    if (!e.target.closest(target)) {
      const isHidden = $(target).classList.contains("hide");
      if (!isHidden) {
        button.click();
      }
    }
  };
});
// function initJsToggle() {
//   //   console.log("aaaaaaaaaaaa");
//   $$(".js-toggle").forEach((button) => {
//     // console(88888888);
//     const target = button.getAttribute("toggle-target");
//     if (!target) {
//       document.body.innerText = `Cần thêm toggle-target cho: ${button.outerHTML}`;
//     }
//     button.onclick = (e) => {
//       e.preventDefault();

//       if (!$(target)) {
//         return (document.body.innerText = `Không tìm thấy phần tử "${target}"`);
//       }
//       const isHidden = $(target).classList.contains("hide");

//       requestAnimationFrame(() => {
//         $(target).classList.toggle("hide", !isHidden);
//         $(target).classList.toggle("show", isHidden);
//       });
//     };
//     document.onclick = function (e) {
//       if (!e.target.closest(target)) {
//         const isHidden = $(target).classList.contains("hide");
//         if (!isHidden) {
//           button.click();
//         }
//       }
//     };
//   });
// }

// window.addEventListener("template-loaded", () => {
//     const links = $$(".js-dropdown-list > li > a");

//     links.forEach((link) => {
//         link.onclick = () => {
//             if (window.innerWidth > 991) return;
//             const item = link.closest("li");
//             item.classList.toggle("navbar__item--active");
//         };
//     });
// });

// window.addEventListener("template-loaded", () => {
//     const tabsSelector = "prod-tab__item";
//     const contentsSelector = "prod-tab__content";

//     const tabActive = `${tabsSelector}--current`;
//     const contentActive = `${contentsSelector}--current`;

//     const tabContainers = $$(".js-tabs");
//     tabContainers.forEach((tabContainer) => {
//         const tabs = tabContainer.querySelectorAll(`.${tabsSelector}`);
//         const contents = tabContainer.querySelectorAll(`.${contentsSelector}`);
//         tabs.forEach((tab, index) => {
//             tab.onclick = () => {
//                 tabContainer.querySelector(`.${tabActive}`)?.classList.remove(tabActive);
//                 tabContainer.querySelector(`.${contentActive}`)?.classList.remove(contentActive);
//                 tab.classList.add(tabActive);
//                 contents[index].classList.add(contentActive);
//             };
//         });
//     });
// });

// window.addEventListener("template-loaded", () => {
//     const switchBtn = document.querySelector("#switch-theme-btn");
//     if (switchBtn) {
//         switchBtn.onclick =

function theme_color() {
  //   console.log("theme_color");
  const isDark = localStorage.dark === "true";
  document.querySelector("html").classList.toggle("dark", !isDark);
  localStorage.setItem("dark", !isDark);
  switchBtn.querySelector("span").textContent = isDark
    ? "Dark mode"
    : "Light mode";
}
//         const isDark = localStorage.dark === "true";
//         switchBtn.querySelector("span").textContent = isDark ? "Light mode" : "Dark mode";
//     }
// });

// const isDark = localStorage.dark === "true";
// document.querySelector("html").classList.toggle("dark", isDark);

// nhận onclick san phẩm yêu thích
function fav_product(button) {
  var product_id = button.getAttribute("data-product-id");

  // Tạo một đối tượng XMLHttpRequest
  var xhr = new XMLHttpRequest();

  // Định nghĩa phương thức và URL của request
  xhr.open("POST", "/user_favourite", true);

  // Thiết lập header cho request
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

  // Xử lý khi request được hoàn thành
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      // Xử lý phản hồi từ backend nếu cần
      console.log(xhr.responseText);
    }
  };

  // Tạo dữ liệu để gửi đến backend
  var data = "product_id=" + product_id;

  // Gửi request với dữ liệu đã tạo
  xhr.send(data);
}

//thêm 1 sản phẩm yêu thích trong cơ sở dữ liệu
function fav_product_plus(button) {
  var product_id = button.getAttribute("data-product-id");

  // Tạo một đối tượng XMLHttpRequest
  var xhr = new XMLHttpRequest();

    // Định nghĩa phương thức và URL của request
    xhr.open("POST", "/user_favourite_plus", true);

  // Thiết lập header cho request
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

  // Xử lý khi request được hoàn thành
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      // Xử lý phản hồi từ backend nếu cần
      console.log(xhr.responseText);
    }
  };

  // Tạo dữ liệu để gửi đến backend
  var data = "product_id=" + product_id;

  // Gửi request với dữ liệu đã tạo
  xhr.send(data);
}

//trừ đi một sản phẩm yêu thích trong cơ sở dữ liệu
function fav_product_minus(button) {
  var product_id = button.getAttribute("data-product-id");

  // Tạo một đối tượng XMLHttpRequest
  var xhr = new XMLHttpRequest();

  // Định nghĩa phương thức và URL của request
  xhr.open("POST", "/user_favourite_minus", true);

  // Thiết lập header cho request
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

  // Xử lý khi request được hoàn thành
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      // Xử lý phản hồi từ backend nếu cần
      console.log(xhr.responseText);
    }
  };

  // Tạo dữ liệu để gửi đến backend
  var data = "product_id=" + product_id;

  // Gửi request với dữ liệu đã tạo
  xhr.send(data);
}

function reloadPage() {
  // window.location.reload();
  // object.reload(forcedReload);
  location.reload();
}
