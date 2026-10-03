const Inventory = require("../models/Inventory");

const createInventoryItem = async (req, res) => {
    try {
        const {
            name,
            category,
            price,
            stock,
            isAvailable,
        } = req.body;

        if (
            !name ||
            !category ||
            price === undefined ||
            stock === undefined
        ) {
            return res.status(400).json({
                message: "Name, category, price and stock are required",
            });
        }

        const item = await Inventory.create({
            name,
            category,
            price,
            stock,
            isAvailable:
                isAvailable === undefined ? stock > 0 : isAvailable,
        });

        return res.status(201).json({
            message: "Inventory item created",
            item,
        });
    } catch (error) {
        console.error("Create inventory error:", error);

        return res.status(500).json({
            message: "Failed to create inventory item",
        });
    }
};

const getInventory = async (req, res) => {
    try {
        const items = await Inventory.find().sort({
            category: 1,
            name: 1,
        });

        return res.status(200).json({
            items,
        });
    } catch (error) {
        console.error("Get inventory error:", error);

        return res.status(500).json({
            message: "Failed to get inventory",
        });
    }
};

const updateInventoryItem = async (req, res) => {
    try {
        const { name, category, price, stock, isAvailable } = req.body;

        const item = await Inventory.findByIdAndUpdate(
            req.params.id,
            {
                ...(name !== undefined && { name }),
                ...(category !== undefined && { category }),
                ...(price !== undefined && { price }),
                ...(stock !== undefined && { stock }),
                ...(isAvailable !== undefined && { isAvailable }),
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!item) {
            return res.status(404).json({
                message: "Inventory item not found",
            });
        }

        if (item.stock === 0 && item.isAvailable) {
            item.isAvailable = false;
            await item.save();
        }

        return res.status(200).json({
            message: "Inventory updated successfully",
            item,
        });
    } catch (error) {
        console.error("Update inventory error:", error);

        return res.status(500).json({
            message: "Failed to update inventory",
        });
    }
};

const deleteInventoryItem = async (req, res) => {
    try {
        const item = await Inventory.findByIdAndDelete(req.params.id);

        if (!item) {
            return res.status(404).json({
                message: "Inventory item not found",
            });
        }

        return res.status(200).json({
            message: "Inventory item deleted",
        });
    } catch (error) {
        console.error("Delete inventory error:", error);

        return res.status(500).json({
            message: "Failed to delete inventory item",
        });
    }
};

module.exports = {
    createInventoryItem,
    getInventory,
    updateInventoryItem,
    deleteInventoryItem,
};