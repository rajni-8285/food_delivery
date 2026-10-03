const crypto = require("crypto");
const Razorpay = require("razorpay");

const Inventory = require("../models/Inventory");
const Order = require("../models/Order");

const createRazorpayInstance = () => {
    if (
        !process.env.RAZORPAY_KEY_ID ||
        !process.env.RAZORPAY_KEY_SECRET
    ) {
        throw new Error("Razorpay configuration is missing");
    }

    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

const createPaymentOrder = async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "At least one pizza item is required",
            });
        }

        let calculatedTotal = 0;
        const processedItems = [];

        for (const item of items) {
            const {
                base,
                sauce,
                cheese,
                vegetables = [],
                quantity,
            } = item;

            if (!base || !sauce || !cheese) {
                return res.status(400).json({
                    message:
                        "Each pizza requires base, sauce and cheese",
                });
            }

            if (!Number.isInteger(quantity) || quantity < 1) {
                return res.status(400).json({
                    message: "Quantity must be at least 1",
                });
            }

            const ids = [
                base,
                sauce,
                cheese,
                ...vegetables,
            ];

            const inventoryItems = await Inventory.find({
                _id: {
                    $in: ids,
                },
                isAvailable: true,
            });

            if (inventoryItems.length !== ids.length) {
                return res.status(400).json({
                    message:
                        "One or more selected pizza ingredients are unavailable",
                });
            }

            for (const inventoryItem of inventoryItems) {
                if (inventoryItem.stock < quantity) {
                    return res.status(400).json({
                        message:
                            `${inventoryItem.name} does not have enough stock`,
                    });
                }
            }

            const baseItem = inventoryItems.find(
                (x) => x._id.toString() === base.toString()
            );

            const sauceItem = inventoryItems.find(
                (x) => x._id.toString() === sauce.toString()
            );

            const cheeseItem = inventoryItems.find(
                (x) => x._id.toString() === cheese.toString()
            );

            const vegetableItems = inventoryItems.filter((x) =>
                vegetables.some(
                    (vegetableId) =>
                        vegetableId.toString() ===
                        x._id.toString()
                )
            );

            const unitPrice =
                baseItem.price +
                sauceItem.price +
                cheeseItem.price +
                vegetableItems.reduce(
                    (sum, vegetable) => sum + vegetable.price,
                    0
                );

            const totalPrice = unitPrice * quantity;

            calculatedTotal += totalPrice;

            processedItems.push({
                base: baseItem._id,
                sauce: sauceItem._id,
                cheese: cheeseItem._id,
                vegetables: vegetableItems.map(
                    (vegetable) => vegetable._id
                ),
                quantity,
                unitPrice,
                totalPrice,
            });
        }

        const razorpay = createRazorpayInstance();

        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(calculatedTotal * 100),
            currency: "INR",
            receipt: `pizza_${Date.now()}`,
        });

        const order = await Order.create({
            customer: req.user._id,
            items: processedItems,
            totalAmount: calculatedTotal,
            paymentStatus: "pending",
            orderStatus: "pending",
            razorpayOrderId: razorpayOrder.id,
        });

        return res.status(201).json({
            message: "Payment order created",
            orderId: order._id,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error("Create payment order error:", error);

        return res.status(500).json({
            message: "Failed to create payment order",
        });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const {
            orderId,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        } = req.body;

        if (
            !orderId ||
            !razorpayOrderId ||
            !razorpayPaymentId ||
            !razorpaySignature
        ) {
            return res.status(400).json({
                message: "Payment verification data is incomplete",
            });
        }

        const order = await Order.findOne({
            _id: orderId,
            customer: req.user._id,
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            });
        }

        if (order.paymentStatus === "paid") {
            return res.status(200).json({
                message: "Payment already verified",
                order,
            });
        }

        if (order.razorpayOrderId !== razorpayOrderId) {
            return res.status(400).json({
                message: "Razorpay order mismatch",
            });
        }

        const generatedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(
                `${razorpayOrderId}|${razorpayPaymentId}`
            )
            .digest("hex");

        if (generatedSignature !== razorpaySignature) {
            order.paymentStatus = "failed";
            await order.save();

            return res.status(400).json({
                message: "Invalid payment signature",
            });
        }

        /*
         * Atomically decrement inventory.
         *
         * We check stock >= quantity while decrementing.
         * If any item cannot be decremented, payment remains
         * recorded but the order is not marked confirmed.
         */
        const decrementOperations = [];

        for (const item of order.items) {
            const ingredientIds = [
                item.base,
                item.sauce,
                item.cheese,
                ...item.vegetables,
            ];

            for (const ingredientId of ingredientIds) {
                decrementOperations.push({
                    id: ingredientId,
                    quantity: item.quantity,
                });
            }
        }

        // Combine duplicate ingredients.
        const quantityMap = new Map();

        for (const operation of decrementOperations) {
            const id = operation.id.toString();

            quantityMap.set(
                id,
                (quantityMap.get(id) || 0) +
                    operation.quantity
            );
        }

        const bulkOperations = [];

        for (const [id, quantity] of quantityMap.entries()) {
            bulkOperations.push({
                updateOne: {
                    filter: {
                        _id: id,
                        stock: {
                            $gte: quantity,
                        },
                    },
                    update: {
                        $inc: {
                            stock: -quantity,
                        },
                    },
                },
            });
        }

        const inventoryResult =
            await Inventory.bulkWrite(bulkOperations);

        if (
            inventoryResult.modifiedCount !==
            bulkOperations.length
        ) {
            return res.status(409).json({
                message:
                    "Payment verified, but inventory changed before order confirmation. Please contact support.",
            });
        }

        // Disable items whose stock has reached zero.
        await Inventory.updateMany(
            {
                stock: 0,
            },
            {
                $set: {
                    isAvailable: false,
                },
            }
        );

        order.paymentStatus = "paid";
        order.orderStatus = "confirmed";
        order.razorpayPaymentId = razorpayPaymentId;
        order.razorpaySignature = razorpaySignature;

        await order.save();

        return res.status(200).json({
            message: "Payment verified and order confirmed",
            order,
        });
    } catch (error) {
        console.error("Payment verification error:", error);

        return res.status(500).json({
            message: "Payment verification failed",
        });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            customer: req.user._id,
        })
            .populate("items.base", "name price category")
            .populate("items.sauce", "name price category")
            .populate("items.cheese", "name price category")
            .populate("items.vegetables", "name price category")
            .sort({
                createdAt: -1,
            });

        return res.status(200).json({
            orders,
        });
    } catch (error) {
        console.error("Get my orders error:", error);

        return res.status(500).json({
            message: "Failed to get orders",
        });
    }
};

const getMyOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            customer: req.user._id,
        })
            .populate("items.base", "name price category")
            .populate("items.sauce", "name price category")
            .populate("items.cheese", "name price category")
            .populate("items.vegetables", "name price category");

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            });
        }

        return res.status(200).json({
            order,
        });
    } catch (error) {
        console.error("Get order error:", error);

        return res.status(500).json({
            message: "Failed to get order",
        });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate(
                "customer",
                "name email"
            )
            .populate("items.base", "name price category")
            .populate("items.sauce", "name price category")
            .populate("items.cheese", "name price category")
            .populate("items.vegetables", "name price category")
            .sort({
                createdAt: -1,
            });

        return res.status(200).json({
            orders,
        });
    } catch (error) {
        console.error("Get all orders error:", error);

        return res.status(500).json({
            message: "Failed to get orders",
        });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const allowedStatuses = [
            "pending",
            "confirmed",
            "preparing",
            "out_for_delivery",
            "delivered",
            "cancelled",
        ];

        const { status } = req.body;

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid order status",
            });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                orderStatus: status,
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            });
        }

        return res.status(200).json({
            message: "Order status updated",
            order,
        });
    } catch (error) {
        console.error("Update order status error:", error);

        return res.status(500).json({
            message: "Failed to update order status",
        });
    }
};

module.exports = {
    createPaymentOrder,
    verifyPayment,
    getMyOrders,
    getMyOrderById,
    getAllOrders,
    updateOrderStatus,
};