from flask import render_template
from flask_mail import Message
import logging

logger = logging.getLogger(__name__)

def send_signup_confirmation(mail, email, first_name):
    try:
        msg = Message(
            "Welcome to U.S ATELIER",
            recipients=[email]
        )
        msg.html = render_template("emails/welcome.html", first_name=first_name)
        mail.send(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send signup confirmation to {email}: {e}")
        return False

def send_password_change_confirmation(mail, email, first_name):
    try:
        msg = Message(
            "Password Changed - U.S ATELIER",
            recipients=[email]
        )
        msg.html = render_template("emails/password_changed.html", first_name=first_name)
        mail.send(msg)
    except Exception as e:
        logger.error(f"Failed to send password change confirmation to {email}: {e}")

def send_order_confirmation(mail, email, order_number, total, items):
    try:
        msg = Message(
            f"Order Confirmed - {order_number}",
            recipients=[email]
        )
        msg.html = render_template(
            "emails/order_confirmation.html",
            order_number=order_number,
            total=total,
            items=items
        )
        mail.send(msg)
    except Exception as e:
        logger.error(f"Failed to send order confirmation to {email}: {e}")

def send_order_status_update(mail, email, order_number, status, tracking_url=None):
    try:
        msg = Message(
            f"Order Status Update - {order_number}",
            recipients=[email]
        )
        msg.html = render_template(
            "emails/order_status_update.html",
            order_number=order_number,
            status=status,
            tracking_url=tracking_url
        )
        mail.send(msg)
    except Exception as e:
        logger.error(f"Failed to send order status update to {email}: {e}")

def send_new_arrival_notification(mail, email, first_name, name, price, category, description, product_id):
    try:
        msg = Message(
            f"New Arrival: {name}",
            recipients=[email]
        )
        msg.html = render_template(
            "emails/new_arrival.html",
            first_name=first_name,
            product_name=name,
            price=price,
            category=category,
            description=description,
            product_id=product_id
        )
        mail.send(msg)
    except Exception as e:
        logger.error(f"Failed to send new arrival notification to {email}: {e}")

def send_otp_email(mail, email, otp, first_name=None):
    try:
        msg = Message(
            "Your Verification Code - U.S ATELIER",
            recipients=[email]
        )
        msg.html = render_template(
            "emails/otp_email.html",
            otp=otp,
            first_name=first_name or "Valued Customer"
        )
        mail.send(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {e}")
        return False


def send_abandoned_cart_email(mail, email: str, first_name: str, items: list, discount_code: str | None = None) -> bool:
    """
    Send an abandoned-cart recovery email.
    items: list of dicts with keys {name, price, quantity, size, image}
    discount_code: optional code to display in the email
    Returns True on success, False on failure.
    """
    import os
    try:
        site_url    = os.getenv("FRONTEND_URL", "https://www.usatelier.in")
        cart_url        = f"{site_url}/cart"
        unsubscribe_url = f"{site_url}/account"

        msg = Message(
            "You left something behind! 🛒",
            recipients=[email],
        )
        msg.html = render_template(
            "emails/abandoned_cart.html",
            first_name=first_name,
            items=items,
            discount_code=discount_code,
            cart_url=cart_url,
            unsubscribe_url=unsubscribe_url,
        )
        mail.send(msg)
        logger.info(f"Abandoned cart email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send abandoned cart email to {email}: {e}")
        return False
