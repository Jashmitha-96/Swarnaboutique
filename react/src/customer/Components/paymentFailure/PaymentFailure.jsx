import React from "react";
import { Alert, AlertTitle, Button } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getOrderById } from "../../../Redux/Customers/Order/Action";
import { useEffect } from "react";

const PaymentFailure = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { order } = useSelector((store) => store);
  const jwt = localStorage.getItem("jwt");

  // Get the order ID from URL parameters
  const searchParams = new URLSearchParams(location.search);
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    if (orderId) {
      dispatch(getOrderById(orderId));
    }
  }, [orderId, dispatch]);

  const handleRetry = () => {
    // Navigate back to order summary to retry payment
    navigate(`/checkout/payment?order_id=${orderId}`);
  };

  const handleGoHome = () => {
    // Navigate to home page
    navigate("/");
  };

  return (
    <div className="px-2 lg:px-36 h-screen flex flex-col items-center justify-center">
      <div className="flex flex-col justify-center items-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <Alert
          variant="filled"
          severity="error"
          sx={{ mb: 4, width: "100%" }}
        >
          <AlertTitle>Payment Failed</AlertTitle>
          Your payment could not be processed
        </Alert>

        <p className="my-4 text-gray-600 text-center">
          We're sorry, but your payment for order #{orderId} could not be completed. Please try again or contact customer support.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full">
          <Button
            variant="contained"
            color="primary"
            onClick={handleRetry}
            fullWidth
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            onClick={handleGoHome}
            fullWidth
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure; 