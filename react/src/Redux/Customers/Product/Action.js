import axios from "axios";

import {
  FIND_PRODUCTS_BY_CATEGORY_REQUEST,
  FIND_PRODUCTS_BY_CATEGORY_SUCCESS,
  FIND_PRODUCTS_BY_CATEGORY_FAILURE,
  FIND_PRODUCT_BY_ID_REQUEST,
  FIND_PRODUCT_BY_ID_SUCCESS,
  FIND_PRODUCT_BY_ID_FAILURE,
  CREATE_PRODUCT_REQUEST,
  CREATE_PRODUCT_SUCCESS,
  CREATE_PRODUCT_FAILURE,
  UPDATE_PRODUCT_REQUEST,
  UPDATE_PRODUCT_SUCCESS,
  UPDATE_PRODUCT_FAILURE,
  DELETE_PRODUCT_REQUEST,
  DELETE_PRODUCT_SUCCESS,
  DELETE_PRODUCT_FAILURE,
  SEARCH_PRODUCT_REQUEST,
  SEARCH_PRODUCT_SUCCESS,
  SEARCH_PRODUCT_FAILURE,
} from "./ActionType";
import api, { API_BASE_URL } from "../../../config/api";

export const findProducts = (reqData) => async (dispatch) => {
  const {
    colors,
    sizes,
    minPrice,
    maxPrice,
    minDiscount,
    category,
    stock,
    sort,
    pageNumber,
    pageSize,
  } = reqData;

  try {
    dispatch({ type: FIND_PRODUCTS_BY_CATEGORY_REQUEST });

    const { data } = await api.get(
      `/api/products?color=${colors}&size=${sizes}&minPrice=${minPrice}&maxPrice=${maxPrice}&minDiscount=${minDiscount}&category=${category}&stock=${stock}&sort=${sort}&pageNumber=${pageNumber}&pageSize=${pageSize}`
    );

    console.log("get product by category - ", data);
    dispatch({
      type: FIND_PRODUCTS_BY_CATEGORY_SUCCESS,
      payload: data,
    });
  } catch (error) {
    dispatch({
      type: FIND_PRODUCTS_BY_CATEGORY_FAILURE,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    });
  }
};

export const findProductById = (reqData) => async (dispatch) => {
  try {
    dispatch({ type: FIND_PRODUCT_BY_ID_REQUEST });

    const { data } = await api.get(`/api/products/id/${reqData.productId}`);

    console.log("products by  id : ", data);
    dispatch({
      type: FIND_PRODUCT_BY_ID_SUCCESS,
      payload: data,
    });
  } catch (error) {
    dispatch({
      type: FIND_PRODUCT_BY_ID_FAILURE,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    });
  }
};

export const searchProduct = (keyword) => async (dispatch) => {
  try {
    dispatch({ type: SEARCH_PRODUCT_REQUEST });

    const { data } = await api.get(`/api/products/search`,{
      params:{
        q:keyword
      }
    });

    console.log("products by  id : ", data);
    dispatch({
      type: SEARCH_PRODUCT_SUCCESS,
      payload: data,
    });
  } catch (error) {
    dispatch({
      type: SEARCH_PRODUCT_FAILURE,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    });
  }
};

export const createProduct = (product) => async (dispatch) => {
  try {
    dispatch({ type: CREATE_PRODUCT_REQUEST });

    // Validate product object and JWT
    if (!product || !product.jwt) {
      throw new Error("Authentication token is missing");
    }
    
    // Validate product data
    if (!product.data) {
      throw new Error("Product data is missing");
    }
    
    // Ensure size data is valid
    const productData = {...product.data};
    if (!Array.isArray(productData.size) || productData.size.length === 0) {
      throw new Error("Product must have at least one size");
    }
    
    // Ensure each size has a name property
    productData.size = productData.size.filter(size => 
      size && typeof size === 'object' && size.name && typeof size.name === 'string'
    );
    
    if (productData.size.length === 0) {
      throw new Error("No valid sizes found with name property");
    }
    
    const config = {
      headers: {
        Authorization: `Bearer ${product.jwt}`,
        'Content-Type': 'application/json'
      }
    };

    const { data } = await api.post(
      `${API_BASE_URL}/api/admin/products/`,
      productData,
      config
    );

    dispatch({
      type: CREATE_PRODUCT_SUCCESS,
      payload: data,
    });

    console.log("created product ", data);
  } catch (error) {
    console.error("Create product error:", error);
    dispatch({
      type: CREATE_PRODUCT_FAILURE,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    });
  }
};

export const updateProduct = (product) => async (dispatch) => {
  try {
    dispatch({ type: UPDATE_PRODUCT_REQUEST });

    const { data } = await api.put(
      `${API_BASE_URL}/api/admin/products/${product.productId}`,
      product
    );

    dispatch({
      type: UPDATE_PRODUCT_SUCCESS,
      payload: data,
    });
  } catch (error) {
    dispatch({
      type: UPDATE_PRODUCT_FAILURE,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    });
  }
};

export const deleteProduct = (productId) => async (dispatch) => {
  console.log("delete product action",productId)
  try {
    dispatch({ type: DELETE_PRODUCT_REQUEST });

    let {data}=await api.delete(`/api/admin/products/${productId}/delete`);

    dispatch({
      type: DELETE_PRODUCT_SUCCESS,
      payload: data,
    });

    console.log("product delte ",data)
  } catch (error) {
    console.log("catch error ",error)
    dispatch({
      type: DELETE_PRODUCT_FAILURE,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    });
  }
};
