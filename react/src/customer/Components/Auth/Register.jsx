import { Grid, TextField, Button, Box, Snackbar, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getUser, register } from "../../../Redux/Auth/Action";
import { Fragment, useEffect, useState } from "react";


export default function RegisterUserForm({ handleNext }) {
  const navigate = useNavigate();
  const dispatch=useDispatch();
  const [openSnackBar,setOpenSnackBar]=useState(false);
  const { auth } = useSelector((store) => store);
  const handleClose=()=>setOpenSnackBar(false);

  const jwt=localStorage.getItem("jwt");

useEffect(()=>{
  if(jwt){
    dispatch(getUser(jwt))
  }

},[jwt])


  useEffect(() => {
    if (auth.user || auth.error) setOpenSnackBar(true)
  }, [auth.user, auth.error]);
  
  const handleSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    
    // Basic validation
    const firstName = data.get("firstName");
    const lastName = data.get("lastName");
    const email = data.get("email");
    const password = data.get("password");
    
    if (!firstName || !lastName || !email || !password) {
      return;
    }
    
    if (password.length < 6) {
      dispatch({
        type: "REGISTER_FAILURE",
        payload: "Password must be at least 6 characters long"
      });
      return;
    }
    
    const userData={
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password,
      role: "ROLE_CUSTOMER" // Always set role as customer
    }
    console.log("user data",userData);
    dispatch(register(userData))
  
  };

  // Determine alert severity based on auth state
  const getAlertSeverity = () => {
    if (auth.error) {
      return "error";
    } else if (auth.user) {
      return "success";
    }
    return "info";
  };

  // Get appropriate message based on auth state
  const getMessage = () => {
    if (auth.error) {
      // Check for specific error types
      if (auth.error.includes("already exists") || auth.error.includes("already registered")) {
        return "This email is already registered. Please use a different email or login.";
      }
      if (auth.error.includes("Request failed with status code 400")) {
        return "Email Is Already Used With Another Account";
      }
      return auth.error;
    } else if (auth.user) {
      return "Registration successful!";
    }
    return "";
  };

  return (
    <div className="">
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              id="firstName"
              name="firstName"
              label="First Name"
              fullWidth
              autoComplete="given-name"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              id="lastName"
              name="lastName"
              label="Last Name"
              fullWidth
              autoComplete="given-name"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              id="email"
              name="email"
              label="Email"
              fullWidth
              autoComplete="email"
              type="email"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              required
              id="password"
              name="password"
              label="Password"
              fullWidth
              autoComplete="new-password"
              type="password"
              helperText="Password must be at least 6 characters long"
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              className="bg-[#9155FD] w-full"
              type="submit"
              variant="contained"
              size="large"
              sx={{padding:".8rem 0"}}
            >
              Register
            </Button>
          </Grid>
        </Grid>
      </form>

<div className="flex justify-center flex-col items-center">
     <div className="py-3 flex items-center ">
        <p className="m-0 p-0">if you have already account ?</p>
        <Button onClick={()=> navigate("/login")} className="ml-5" size="small">
          Login
        </Button>
      </div>
</div>

<Snackbar open={openSnackBar} autoHideDuration={6000} onClose={handleClose}>
  <Alert onClose={handleClose} severity={getAlertSeverity()} sx={{ width: '100%' }}>
    {getMessage()}
  </Alert>
</Snackbar>
     
    </div>
  );
}
