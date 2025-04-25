import { Grid, Typography, Link } from '@mui/material';

const Footer = () => {
  return (
    <Grid className='bg-black text-white mt-10 text-center' container sx={{ bgcolor: 'black', color: 'white', py: 2 }}>
      <Grid item xs={12}>
        <Typography variant="body2" component="p" align="center" sx={{ pb: 1 }}>
          &copy; 2025 Shop With Jeshmi. All rights reserved.
        </Typography>
        <Typography variant="body2" component="p" align="center" sx={{ pb: 1 }}>
          <Link href="/privacy" color="inherit" sx={{ mx: 1 }}>
            Privacy
          </Link>
          |
          <Link href="/terms" color="inherit" sx={{ mx: 1 }}>
            Terms
          </Link>
          |
          <Link href="/contact" color="inherit" sx={{ mx: 1 }}>
            Contact
          </Link>
        </Typography>
      </Grid>
    </Grid>
  );
};

export default Footer;
