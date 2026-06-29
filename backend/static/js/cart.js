// Cart management module
const CartModule = {
    items: [],

    async loadCart() {
        try {
            const res = await fetch('/api/cart');
            const data = await res.json();
            this.items = Array.isArray(data) ? data : [];
            this.updateCartUI();
        } catch (error) {
            console.log("[v0] Error loading cart:", error);
        }
    },

    async addToCart(product) {
        const item = {
            id: product.id,
            name: product.name,
            sellingPrice: product.sellingPrice,
            size: product.size || 'One Size',
            quantity: product.quantity || 1,
            image: product.image || product.images?.[0] || 'placeholder.svg'
        };

        try {
            const res = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            const data = await res.json();
            this.items = data.cart || [];
            this.updateCartUI();
            return data;
        } catch (error) {
            console.log("[v0] Error adding to cart:", error);
        }
    },

    async removeFromCart(itemId) {
        try {
            const res = await fetch(`/api/cart/${itemId}`, { method: 'DELETE' });
            const data = await res.json();
            this.items = data.cart || [];
            this.updateCartUI();
        } catch (error) {
            console.log("[v0] Error removing from cart:", error);
        }
    },

    async updateQuantity(itemId, size, quantity) {
        try {
            const res = await fetch('/api/cart/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: itemId, size, quantity })
            });
            const data = await res.json();
            this.items = data.cart || [];
            this.updateCartUI();
        } catch (error) {
            console.log("[v0] Error updating quantity:", error);
        }
    },

    async clearCart() {
        try {
            const res = await fetch('/api/cart/clear', { method: 'POST' });
            const data = await res.json();
            this.items = [];
            this.updateCartUI();
        } catch (error) {
            console.log("[v0] Error clearing cart:", error);
        }
    },

    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    },

    updateCartUI() {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            const count = this.items.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = count;
        }
    }
};

// Load cart on page load
document.addEventListener('DOMContentLoaded', () => {
    CartModule.loadCart();
});
