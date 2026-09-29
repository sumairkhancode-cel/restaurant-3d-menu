require("dotenv").config();

const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const Dish = require("./models/Dish");
const Admin = require("./models/admin");
const bcrypt = require("bcrypt");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const app = express();
const PORT = process.env.PORT || 3000;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(
    session({
        secret: process.env.SESSION_SECRET || "restaurant-menu-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true
        }
    })
);

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const isGLB = file.originalname
            .toLowerCase()
            .endsWith(".glb");

        if (!isGLB) {
            return cb(new Error("Only .glb files are allowed"));
        }

        cb(null, true);
    }
});

// Middleware
app.use(express.json());

app.get("/admin/", (req, res) => {
    if (!req.session.adminId) {
        return res.redirect("/admin/login.html");
    }

    res.sendFile(path.join(__dirname, "admin", "index.html"));
});

app.get("/admin/index.html", (req, res) => {
    if (!req.session.adminId) {
        return res.redirect("/admin/login.html");
    }

    res.sendFile(path.join(__dirname, "admin", "index.html"));
});
app.use(express.static(__dirname, {
    index: false
}));


// MongoDB connection
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
    })
    .catch((error) => {
        console.error("MongoDB connection failed:");
        console.error(error.message);
    });

// Homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Dish page
app.get("/food/:dish", (req, res) => {
    res.sendFile(path.join(__dirname, "food", "index.html"));
});
app.get("/api/dishes", async (req, res) => {
    try {
        const dishes = await Dish.find({
            available: true
        });

        res.json(dishes);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

app.get("/api/dishes/:slug", async (req, res) => {
    try {
        const dish = await Dish.findOne({
            slug: req.params.slug,
            available: true
        });

        if (!dish) {
            return res.status(404).json({
                message: "Dish not found"
            });
        }

        res.json(dish);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});
app.put("/api/dishes/:id",requireAdmin, async (req, res) => {
    try {
        const dish = await Dish.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!dish) {
            return res.status(404).json({
                message: "Dish not found"
            });
        }

        res.json(dish);
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: "Failed to update dish",
            error: error.message
        });
    }
});

app.delete("/api/dishes/:id",requireAdmin, async (req, res) => {
    try {
        const dish = await Dish.findByIdAndDelete(req.params.id);

        if (!dish) {
            return res.status(404).json({
                message: "Dish not found"
            });
        }

        res.json({
            message: "Dish deleted successfully"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete dish"
        });
    }
});
app.post("/api/upload-model", requireAdmin, (req, res) => {
    upload.single("model")(req, res, async (error) => {
        if (error) {
            console.error(error);

            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    message: "Model file is too large. Maximum size is 20 MB."
                });
            }

            return res.status(400).json({
                message: error.message || "Failed to upload model"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "No model file uploaded"
            });
        }

        try {
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: "raw",
                        folder: "restaurant-3d-menu"
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );

                stream.end(req.file.buffer);
            });

            res.json({
                message: "Model uploaded successfully",
                modelUrl: result.secure_url
            });

        } catch (error) {
            console.error("Cloudinary upload error:", error);

            res.status(500).json({
                message: "Failed to upload model to Cloudinary"
            });
        }
    });
});

app.post("/api/dishes",requireAdmin, async (req, res) => {
    try {
        const dish = await Dish.create(req.body);

        res.status(201).json(dish);
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: "Failed to create dish",
            error: error.message
        });
    }
});

app.post("/api/admin/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required."
            });
        }

        const admin = await Admin.findOne({ username });

        if (!admin) {
            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            admin.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        req.session.adminId = admin._id.toString();

        res.json({
            message: "Login successful."
        });

    } catch (error) {
        console.error("Admin login error:", error);

        res.status(500).json({
            message: "Server error."
        });
    }
});
app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error("Admin logout error:", error);

            return res.status(500).json({
                message: "Logout failed."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Logout successful."
        });
    });
});
function requireAdmin(req, res, next) {
    if (!req.session.adminId) {
        return res.status(401).json({
            message: "Admin authentication required."
        });
    }

    next();
}


