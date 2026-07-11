import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models_mysql import Coupon


def test_auto_qualifies_with_min_order_amount():
    coupon = Coupon(
        code="TEST10",
        coupon_type="standard",
        discount_type="percent",
        discount_value=10,
        min_order_amount=1000,
        is_active=True,
        visibility="visible",
    )

    assert coupon.auto_qualifies(1000, cart_items=[]) is True
    assert coupon.auto_qualifies(999, cart_items=[]) is False


def test_auto_qualifies_for_buy_n_get_n_with_quantity():
    coupon = Coupon(
        code="BUY2GET1",
        coupon_type="buy_n_get_n",
        discount_type="buy_n_get_n",
        discount_value=0,
        min_order_amount=0,
        buy_quantity=2,
        get_quantity=1,
        is_active=True,
        visibility="visible",
    )

    cart_items = [{"quantity": 2, "sellingPrice": 500}]
    assert coupon.auto_qualifies(1000, cart_items=cart_items) is True

    cart_items = [{"quantity": 1, "sellingPrice": 500}]
    assert coupon.auto_qualifies(1000, cart_items=cart_items) is False


def test_auto_qualifies_visible_coupon_without_min_order_threshold():
    coupon = Coupon(
        code="WELCOME10",
        coupon_type="standard",
        discount_type="percent",
        discount_value=10,
        min_order_amount=0,
        is_active=True,
        visibility="visible",
    )

    assert coupon.auto_qualifies(0, cart_items=[{"quantity": 3, "sellingPrice": 500}]) is True
    assert coupon.auto_qualifies(0, cart_items=[]) is False
