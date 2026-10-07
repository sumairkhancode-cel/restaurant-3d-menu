const mongoose = require("mongoose");

const dishSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        slug: {
            type: String,
            required: true,
            unique: true
        },

        category: {
            type: String,
            required: true
        },

        description: {
            type: String,
            required: true
        },

        price: {
            type: Number,
            required: true
        },

        modelUrl: {
            type: String,
            required: true
        },

        usdzUrl: {
            type: String,
            default: ""
        },

        available: {    
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Dish", dishSchema);