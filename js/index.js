import axios from 'axios';
import validate from 'validate.js';
import Swal from 'sweetalert2/dist/sweetalert2.js'
import 'sweetalert2/src/sweetalert2.scss'


const baseUrl = 'https://livejs-api.hexschool.io';
const apiPath = 'haojing';
const token = '2FB8frebN0avU2ZWkVgSkuMD4Ry2';

const productCardWrap = document.querySelector('.productWrap');
const productSelect = document.querySelector('.productSelect');
const shoppingCartTable = document.querySelector('.shoppingCart-table');
const shoppingCartBody = document.querySelector('.shoppingCart-table tbody');
const shoppingCartFoot = document.querySelector('.shoppingCart-table tfoot');
const discardAllBtn = document.querySelector('.discardAllBtn');
const discardBtn = document.querySelectorAll('.discardBtn');
const orderInfoForm = document.querySelector('.orderInfo-form');
const orderInfoBtn = document.querySelector('.orderInfo-btn');



// 取得產品列表
let productList = [];

async function getProductList() {
    try {
        const response = await axios.get(`${baseUrl}/api/livejs/v1/customer/${apiPath}/products`);
        productList = response.data.products;
        console.log('取得產品列表',productList);
        renderProductList();
        
    } catch (error) {
        handleError('取得產品列表失敗', error);
    }
}
getProductList();

function renderProductList(products = productList) {
    productCardWrap.innerHTML = products.map((item) => 
        `<li class="productCard">
            <h4 class="productType">新品</h4>
            <img src="${item.images}" alt="img-${item.title}">
            <a href="#" class="addCardBtn" data-id="${item.id}">加入購物車</a>
            <h3>${item.title}</h3>
            <del class="originPrice">NT$${item.origin_price}</del>
            <p class="nowPrice">NT$${item.price}</p>
        </li>`
    ).join('');
}

const filterProductByCategory = (category) => {
    if (category === '全部') {
        return productList;
    }
    return productList.filter((item) => item.category === category);
}

const updateSearchResult = (category) => {
    const filteredProducts = filterProductByCategory(category);
    renderProductList(filteredProducts);
}

productSelect.addEventListener('change', () => {
    updateSearchResult(productSelect.value);
})


// 取得購物車列表
let cartList = [];
let cartTotalPrice = 0;

async function getCartList() {
    try {
        shoppingCartBody.classList.add('loading');
        const response = await axios.get(`${baseUrl}/api/livejs/v1/customer/${apiPath}/carts`);
        console.log('cartlist:', response.data);
        cartList = response.data.carts;
        cartTotalPrice = response.data.finalTotal;
        renderCart();
    } catch(error) {
        handleError('取得購物車失敗', error);
    }
}
getCartList();

const renderCart = (product = cartList) => {
    if (cartList.length === 0) {
        shoppingCartBody.innerHTML = shoppingCartBody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-8">
                購物車是空的
            </td>
        </tr>`;
        shoppingCartFoot.innerHTML = '';
        return;
    }
    

    shoppingCartBody.innerHTML = product.map((item) => 
        `<tr>
            <td>
                <div class="cardItem-title">
                    <img src="${item.product.images}" alt="${item.product.title}">
                    <p>${item.product.title}</p>
                </div>
            </td>
            <td>NT$${item.product.price}</td>
            <td>
                <a href="#" class="material-icons fs-5 btn-decrease ${item.quantity === 1 ? 'disabled' : ''}" data-id="${item.id}">
                    remove
                </a>
                ${item.quantity}
                <a href="#" class="material-icons fs-5 btn-increase" data-id="${item.id}">
                    add
                </a>
            </td>
            <td>NT$${item.product.price * item.quantity}</td>
            <td class="discardBtn">
                <a href="#" class="material-icons" data-id="${item.id}">
                    clear
                </a>
            </td>
        </tr>`
    ).join('');
    

    shoppingCartFoot.innerHTML = `
        <tr>
            <td>
                <a href="#" class="discardAllBtn">刪除所有品項</a>
            </td>
            <td></td>
            <td></td>
            <td>
                <p>總金額</p>
            </td>
            <td>NT$${cartTotalPrice}</td>
        </tr>`;
}


// 加入購物車
async function addCartItem(productId, quantity = 1) {
    try {
        const existingCartItem = cartList.find(item => item.product.id === productId);
        if (existingCartItem) {
            const response = await axios.patch(`${baseUrl}/api/livejs/v1/customer/${apiPath}/carts`, {
                data: {
                    "id": existingCartItem.id,
                    "quantity": existingCartItem.quantity + quantity
                }
            });
            showToast("商品數量已更新");
        } else {
            const response = await axios.post(`${baseUrl}/api/livejs/v1/customer/${apiPath}/carts`, {
                data: {
                    "productId": productId,
                    "quantity": quantity
                }
            });
            showToast("已加入購物車");
        }
        await getCartList();
    } catch(error) {
        handleError('加入購物車失敗', error);
    }   
}


// Add product to cart
productCardWrap.addEventListener('click', async (event) => {
    event.preventDefault();
    if(event.target.classList.contains('addCardBtn')) {
        const productId = event.target.dataset.id;
        console.log('add productId:', productId);
        await addCartItem(productId);
        await getCartList();
    }
})

// Cart item -/+ quantity
async function updateCartQuantity(cartId, newQuantity) {
    try {
        const response = await axios.patch(`${baseUrl}/api/livejs/v1/customer/${apiPath}/carts`, {
            data: {
                "id": cartId,
                "quantity": newQuantity
            }
        });
        await getCartList();
        return response.data;
    } catch (error) {
        handleError('更新購物車商品數量失敗', error);
    }
}

shoppingCartBody.addEventListener('click', async (event) => {
    event.preventDefault();

    const cartRow = event.target.closest('tr');
    const cartId = event.target.dataset.id;

    if (!cartRow || !cartId) {
        return;
    }  

    const cartItem = cartList.find((item) => item.id === cartId);
    if(!cartItem) {
        return;
    }

    if (event.target.classList.contains('btn-increase')) {
        await updateCartQuantity(cartId, cartItem.quantity + 1);
    }
    
    if (event.target.classList.contains('btn-decrease')) {
        await updateCartQuantity(cartId, cartItem.quantity - 1);
    }
})


// 移除購物車單一商品
async function deleteCartItem(cartId) {
    try {
        const response = await axios.delete(`${baseUrl}/api/livejs/v1/customer/${apiPath}/carts/${cartId}`);
        await getCartList();

        await Swal.fire({
            icon: 'success',
            title: '成功刪除商品',
            showConfirmButton: false,
            timer: 1500
        });
    } catch (error) {
        handleError('刪除購物車商品失敗', error);
    }
}

shoppingCartBody.addEventListener('click', async (event) => {
    event.preventDefault();

    if (event.target.closest('.discardBtn')) {
        const cartId = event.target.dataset.id;

        if (cartId) {
            try {
                const isConfirmed = await confirmDelete('確定要刪除此商品？');
                if (isConfirmed) {
                    await deleteCartItem(cartId);
                }
            } catch (error) {
                handleError('刪除購物車商品失敗', error);
            }
        }
    }
})

// 移除購物車全部商品
async function deleteAllCartItems() {
    try {
        if (!cartList || cartList.length === 0) {
            await Swal.fire({
                icon: 'info',
                title: '購物車是空的',
                showConfirmButton: false,
                timer: 1500
            });
            return;
        }
        const response = await axios.delete(`${baseUrl}/api/livejs/v1/customer/${apiPath}/carts`);
        await getCartList();

        await Swal.fire({
            icon: 'success',
            title: '成功刪除全部商品',
            showConfirmButton: false,
            timer: 1500
        });
    } catch (error) {
        handleError('刪除購物車全部商品失敗', error);
    }
}

shoppingCartTable.addEventListener('click', async (event) => {
    event.preventDefault();

    if (event.target.classList.contains('discardAllBtn')) {
        try {
            const isConfirmed = await confirmDelete('確定刪除購物車全部商品？');
            if (isConfirmed) {
                await deleteAllCartItems();
            }
        } catch (error) {
            handleError('刪除購物車全部商品失敗', error);
        }
    }
})

async function confirmDelete(message) {
    const result = await Swal.fire({
        icon: 'warning',
        title: '確定刪除？',
        text: message,
        showCancelButton: true,
        confirmButtonText: '確定',
        cancelButtonText: '取消刪除',
    })
    console.log('result:', result);
    return result.isConfirmed;
}

// ===============================

// 提交訂單
function validateForm(formData) {
    const constraints = {
        姓名: {
            presence: {
                allowEmpty: false,
                message: '^姓名為必填欄位'
            }
        },
        電話: {
            presence: {
                allowEmpty: false,
                message: '^電話不能為空'
            }
        },
        Email: {
            presence: {
                allowEmpty: false,
                message: '^Email為必填欄位'
            },
            email: {
                message: "^請填寫正確的Email格式"
            }
        },
        寄送地址: {
            presence: {
                allowEmpty: false,
                message: '^地址為必填欄位'
            }
        },
        交易方式: {
            presence: {
                allowEmpty: false,
                message: '^交易方式為必填欄位'
            },
        }
    }

    const errors = validate(formData, constraints);

    const messageElements = document.querySelectorAll('[data-message]');
    messageElements.forEach(element => {
        element.textContent = '';
    })
    
    if (errors) {
        Object.keys(errors).forEach((fieldName) => {
            const message = document.querySelector(`[data-message="${fieldName}"]`);
            if (message) {
                message.textContent = errors[fieldName][0];
            }
        })
        return false;
    }
    return true;
}

function getFormData() {
    return {
        姓名: document.querySelector('#customerName').value,
        電話: document.querySelector('#customerPhone').value,
        Email: document.querySelector('#customerEmail').value,
        寄送地址: document.querySelector('#customerAddress').value,
        交易方式: document.querySelector('#tradeWay').value
    }
}

async function createOrder(formData) {
    try {
        if (cartList.length === 0) {
            await Swal.fire({
                icon: 'error',
                title: '購物車是空的，無法建立訂單',
                showConfirmButton: false,
                timer: 1500
            });
            return;
        }

        const response = await axios.post(`${baseUrl}/api/livejs/v1/customer/${apiPath}/orders`, {
            data: {
                user: {
                    name: formData.姓名,
                    tel: formData.電話,
                    email: formData.Email,
                    address: formData.寄送地址,
                    payment: formData.交易方式,
                }
            }
        })
        
        renderCart();

        await Swal.fire({
            icon: 'success',
            title: '成功送出訂單',
            showConfirmButton: false,
            timer: 1500
        });
        
    } catch (error) {
        handleError('建立訂單失敗', error);
    }
}

orderInfoForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = getFormData();
    const isValid = validateForm(formData);

    if (!isValid) {
        return;
    }

    await createOrder(formData);
})


// ===============================

function showToast(message) {
    const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: false,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });

    Toast.fire({
        icon: "success",
        title: message
    });
}

function handleError(message, error) {
    console.error(message, error);
    const errorMessage = error?.response?.data?.message || '發生了一些錯誤，請稍後再試';
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: errorMessage,
    });
}

function init() {
    getProductList();
    getCartList();
}
init();