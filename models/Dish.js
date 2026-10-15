
const mongoose = require("mongoose");

const dishSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            match: /^[a-z0-9-]+$/,
            maxlength: 100,
            trim: true
        },

        category: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000
        },

        price: {
            type: Number,
            required: true,
            min: 0,
            max: 100000000
        },

        modelUrl: {
            type: String,
            required: true,
            trim: true,
            match: /^https:\/\/.+/
        },

        usdzUrl: {
            type: String,
            default: "",
            trim: true,
            validate: {
                validator: value => value === "" || /^https:\/\/.+/.test(value),
                message: "USDZ URL must use HTTPS."
            }
        },

        available: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        strict: "throw"
    }
);

module.exports = mongoose.model("Dish", dishSchema);
