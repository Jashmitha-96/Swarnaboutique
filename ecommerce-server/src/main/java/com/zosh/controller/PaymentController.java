package com.zosh.controller;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent; // Needed for PaymentIntent ID
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

import com.zosh.exception.OrderException;
import com.zosh.exception.UserException;
import com.zosh.modal.Order;
import com.zosh.modal.User;
import com.zosh.repository.OrderRepository;
import com.zosh.response.ApiResponse;
import com.zosh.response.PaymentLinkResponse;
import com.zosh.service.OrderService;
import com.zosh.service.UserService;
import com.zosh.user.domain.OrderStatus;
import com.zosh.user.domain.PaymentStatus;

@RestController
@RequestMapping("/api")
public class PaymentController {
	
	private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);

	@Value("${stripe.api.key}")
	private String publicKey;

	@Value("${stripe.api.secret}")
	private String secretKey;

	// Inject the webhook secret
	@Value("${stripe.webhook.secret}")
	private String webhookSecret;
	
	private OrderService orderService;
	private UserService userService;
	private OrderRepository orderRepository;
	
	@Autowired
	public PaymentController(OrderService orderService, UserService userService, OrderRepository orderRepository,
	                         @Value("${stripe.api.secret}") String secretKey) {
		this.orderService = orderService;
		this.userService = userService;
		this.orderRepository = orderRepository;
		this.secretKey = secretKey;
		Stripe.apiKey = this.secretKey;
	}
	
	@PostMapping("/payments/{orderId}")
	public ResponseEntity<PaymentLinkResponse> createPaymentCheckoutSession(@PathVariable Long orderId,
			@RequestHeader("Authorization") String jwt)
					throws UserException, OrderException, StripeException {
		
		Order order = orderService.findOrderById(orderId);
		
        String successUrl = "http://localhost:4200/payment-success?order_id=" + order.getId(); 
        String cancelUrl = "http://localhost:4200/payment-cancel"; 

        SessionCreateParams.LineItem.Builder lineItemBuilder = SessionCreateParams.LineItem.builder();
        lineItemBuilder.setQuantity(1L);

        SessionCreateParams.LineItem.PriceData.Builder priceDataBuilder = SessionCreateParams.LineItem.PriceData.builder();
        priceDataBuilder.setCurrency("inr");
        priceDataBuilder.setUnitAmount((long) order.getTotalPrice() * 100);
        
        SessionCreateParams.LineItem.PriceData.ProductData.Builder productDataBuilder = 
            SessionCreateParams.LineItem.PriceData.ProductData.builder();
        productDataBuilder.setName("Order #" + order.getId());

        priceDataBuilder.setProductData(productDataBuilder.build());
        lineItemBuilder.setPriceData(priceDataBuilder.build());

        SessionCreateParams params = SessionCreateParams.builder()
                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .addLineItem(lineItemBuilder.build())
                .setCustomerEmail(order.getUser().getEmail())
                .putMetadata("order_id", order.getId().toString())
                .build();

        Session session = Session.create(params);

        PaymentLinkResponse paymentLinkResponse = new PaymentLinkResponse();
        paymentLinkResponse.setPayment_link_url(session.getUrl()); 
        paymentLinkResponse.setPayment_link_id(session.getId());

        order.setOrderId(session.getId());
        orderRepository.save(order);

        return new ResponseEntity<>(paymentLinkResponse, HttpStatus.CREATED);
	}
	
	// Stripe Webhook Handler
    @PostMapping("/stripe/webhook")
    public ResponseEntity<ApiResponse> stripeWebhook(@RequestBody String payload, @RequestHeader("Stripe-Signature") String sigHeader) {
        logger.info("Received Stripe webhook event");

        if (webhookSecret == null) {
            logger.error("Webhook secret is not configured.");
            return new ResponseEntity<>(new ApiResponse("Webhook secret not configured", false), HttpStatus.INTERNAL_SERVER_ERROR);
        }

        Event event;

        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
            logger.info("Webhook event verified successfully: {}", event.getId());
        } catch (SignatureVerificationException e) {
            // Invalid signature
            logger.warn("Webhook error while validating signature: {}", e.getMessage());
            return new ResponseEntity<>(new ApiResponse("Invalid Stripe signature", false), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            logger.error("Error processing webhook: {}", e.getMessage());
            return new ResponseEntity<>(new ApiResponse("Webhook processing error", false), HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Deserialize the nested object inside the event
        EventDataObjectDeserializer dataObjectDeserializer = event.getDataObjectDeserializer();
        StripeObject stripeObject = null;
        if (dataObjectDeserializer.getObject().isPresent()) {
            stripeObject = dataObjectDeserializer.getObject().get();
        } else {
             logger.warn("Webhook event data object is empty. Event type: {}", event.getType());
            // Handle edge case (sometimes data might be empty)
            return new ResponseEntity<>(new ApiResponse("Webhook event data missing", false), HttpStatus.BAD_REQUEST);
        }

        // Handle the event
        switch (event.getType()) {
            case "checkout.session.completed":
                logger.info("Handling checkout.session.completed event");
                Session session = (Session) stripeObject;
                // Extract order ID from metadata
                String orderIdStr = session.getMetadata().get("order_id");
                String stripePaymentIntentId = session.getPaymentIntent(); // Get Payment Intent ID

                if (orderIdStr == null) {
                    logger.error("Order ID missing in webhook metadata for session: {}", session.getId());
                    return new ResponseEntity<>(new ApiResponse("Missing order_id in metadata", false), HttpStatus.BAD_REQUEST);
                }

                try {
                    Long orderId = Long.parseLong(orderIdStr);
                    Order order = orderService.findOrderById(orderId);

                    if (order == null) {
                       logger.error("Order not found for ID: {}", orderId);
                       return new ResponseEntity<>(new ApiResponse("Order not found", false), HttpStatus.NOT_FOUND);
                    }
                    
                    // Update order status and payment details
                    // Ensure idempotency: check if order is already processed
                    if (order.getOrderStatus() != OrderStatus.PLACED && order.getPaymentDetails().getStatus() != PaymentStatus.COMPLETED) {
                        order.getPaymentDetails().setPaymentId(stripePaymentIntentId); // Store Payment Intent ID
                        order.getPaymentDetails().setStatus(PaymentStatus.COMPLETED); 
                        order.setOrderStatus(OrderStatus.PLACED);
                        orderRepository.save(order);
                        logger.info("Order {} updated successfully for Stripe payment {}", orderId, stripePaymentIntentId);
                    } else {
                         logger.info("Order {} already processed for payment {}. Skipping update.", orderId, stripePaymentIntentId);
                    }

                } catch (NumberFormatException e) {
                    logger.error("Invalid order_id format in metadata: {}", orderIdStr);
                    return new ResponseEntity<>(new ApiResponse("Invalid order_id format", false), HttpStatus.BAD_REQUEST);
                } catch (OrderException e) {
                    logger.error("Error finding order for ID {}: {}", orderIdStr, e.getMessage());
                     return new ResponseEntity<>(new ApiResponse("Error finding order", false), HttpStatus.INTERNAL_SERVER_ERROR);
                }
                break;
            // TODO: Handle other event types as needed (e.g., payment_failed)
            // case "payment_intent.succeeded":
            //     PaymentIntent paymentIntent = (PaymentIntent) stripeObject;
            //     // Then define and call a method to handle the successful payment intent.
            //     // handlePaymentIntentSucceeded(paymentIntent);
            //     break;
            // case "payment_method.attached":
            //     PaymentMethod paymentMethod = (PaymentMethod) stripeObject;
            //     // Then define and call a method to handle the successful attachment of a PaymentMethod.
            //     // handlePaymentMethodAttached(paymentMethod);
            //     break;
            default:
                logger.warn("Unhandled event type: {}", event.getType());
        }

        return new ResponseEntity<>(new ApiResponse("Webhook received", true), HttpStatus.OK);
    }

}
