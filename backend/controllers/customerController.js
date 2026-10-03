const Customer = require("../models/Customer");

const getMyCustomerProfile = async (req, res) => {
    try {
        const customer = await Customer.findOne({
            user: req.user._id,
        });

        if (!customer) {
            return res.status(404).json({
                message: "Customer profile not found",
            });
        }

        return res.status(200).json({
            customer,
        });
    } catch (error) {
        console.error("Get profile error:", error);

        return res.status(500).json({
            message: "Failed to get customer profile",
        });
    }
};

const updateMyCustomerProfile = async (req, res) => {
    try {
        const { phone, address } = req.body;

        const customer = await Customer.findOneAndUpdate(
            {
                user: req.user._id,
            },
            {
                phone: phone ?? "",
                address: address ?? "",
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!customer) {
            return res.status(404).json({
                message: "Customer profile not found",
            });
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            customer,
        });
    } catch (error) {
        console.error("Update profile error:", error);

        return res.status(500).json({
            message: "Failed to update profile",
        });
    }
};

module.exports = {
    getMyCustomerProfile,
    updateMyCustomerProfile,
};