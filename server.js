require("dotenv").config();

const express = require("express");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const path = require("path");
const Dish = require("./models/Dish");
const Admin = require("./models/admin");
const bcrypt = require("bcrypt");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;


const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            message: "Too many failed login attempts. Login is blocked for 15 minutes; please try again later."
        });
    }
});


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
       cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
}
    })
);

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 9 * 1024 * 1024,
        files: 2,
        fields: 10,
        parts: 12
    },

    fileFilter: (req, file, cb) => {
        const fileName = file.originalname.toLowerCase();

        const isAllowedType = file.fieldname === "model"
            ? fileName.endsWith(".glb")
            : file.fieldname === "usdz" && fileName.endsWith(".usdz");

        if (!isAllowedType) {
            const error = new Error("Only .glb and .usdz files are allowed.");
            error.code = "INVALID_FILE_TYPE";
            return cb(error);
        }

        cb(null, true);
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const preventAdminPageCaching = (req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
};

app.get("/admin/", preventAdminPageCaching, (req, res) => {
    if (!req.session.adminId) {
        return res.redirect("/admin/login.html");
    }

    res.sendFile(path.join(__dirname, "admin", "index.html"));
});

app.get("/admin/index.html", preventAdminPageCaching, (req, res) => {
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

app.get("/api/whatsapp", (req, res) => {
    const rawNumber = process.env.WHATSAPP_NUMBER;

    if (!rawNumber || !rawNumber.trim()) {
        return res.status(503).json({
            message: "WhatsApp ordering is not configured. Set WHATSAPP_NUMBER in .env."
        });
    }

    const formattedNumber = rawNumber.trim();
    const number = formattedNumber.replace(/\D/g, "");
    if (
        !/^\+?[\d\s().-]+$/.test(formattedNumber) ||
        !/^\d{7,15}$/.test(number)
    ) {
        return res.status(500).json({
            message: "The configured WhatsApp number must include 7 to 15 digits."
        });
    }

    res.json({ number });
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

        res.json({
    name: dish.name,
    slug: dish.slug,
    category: dish.category,
    description: dish.description,
    price: dish.price,
    modelUrl: dish.modelUrl,
    usdzUrl: dish.usdzUrl
});
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});
app.put("/api/dishes/:id",requireAdmin, async (req, res) => {
    try {
                if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: "Invalid dish ID"
            });
        }
        
const { name, slug, category, description, price, modelUrl, usdzUrl, available } = req.body;

if (
    typeof name !== "string" || !name.trim() ||
    typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug) ||
    typeof category !== "string" || !category.trim() ||
    typeof description !== "string" || !description.trim() ||
    !Number.isFinite(Number(price)) || Number(price) < 0 ||
    typeof modelUrl !== "string" || !modelUrl.trim() ||
    (usdzUrl !== undefined && typeof usdzUrl !== "string") ||
    (available !== undefined && typeof available !== "boolean")
) {
    return res.status(400).json({ message: "Invalid dish data." });
}

const dish = await Dish.findByIdAndUpdate(
    req.params.id,
    {
        name: name.trim(),
        slug,
        category: category.trim(),
        description: description.trim(),
        price: Number(price),
        modelUrl,
        usdzUrl: usdzUrl || "",
        available: available ?? true
    },
    {
        returnDocument: "after",
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

       res.status(500).json({
    message: "Failed to update dish."
});
    }
});

app.delete("/api/dishes/:id",requireAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
        message: "Invalid dish ID"
    });
}

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
    upload.fields([
        { name: "model", maxCount: 1 },
        { name: "usdz", maxCount: 1 }
    ])(req, res, async (error) => {
        if (error) {
            if (error.code === "INVALID_FILE_TYPE") {
                return res.status(400).json({
                    message: error.message
                });
            }

            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    message: "Each model file must be no larger than 9 MiB."
                });
            }

            return res.status(400).json({
                message: error.message || "Failed to upload model"
            });
        }

        if (!req.files || !req.files.model) {
            return res.status(400).json({
                message: "No GLB model file uploaded"
            });
        }

        
try {
    const { fileTypeFromBuffer } = await import("file-type");

    const glbType = await fileTypeFromBuffer(req.files.model[0].buffer);

    if (!glbType || glbType.ext !== "glb") {
        return res.status(400).json({
            message: "Invalid GLB file."
        });
    }

    if (req.files.usdz) {
    const usdzBuffer = req.files.usdz[0].buffer;

    const usdzType = await fileTypeFromBuffer(usdzBuffer);

    if (!usdzType || usdzType.ext !== "zip") {
        return res.status(400).json({
            message: "Invalid USDZ file."
        });
    }

    if (usdzBuffer.length < 4 || usdzBuffer.length > 9 * 1024 * 1024) {
        return res.status(400).json({
            message: "Invalid USDZ file size."
        });
    }
}

    const glbResult = await new Promise((resolve, reject) => {

            

                const stream = cloudinary.uploader.upload_chunked_stream(
                    {
                        resource_type: "raw",
                        folder: "restaurant-3d-menu",
                        chunk_size: 6000000   
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );

                stream.end(req.files.model[0].buffer);
            });

            let usdzUrl = "";

            if (req.files.usdz) {
                const usdzResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_chunked_stream(
                        {
                            resource_type: "raw",
                            folder: "restaurant-3d-menu",
                            chunk_size: 6000000
                        },
                        (error, result) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        }
                    );

                    stream.end(req.files.usdz[0].buffer);
                });

                usdzUrl = usdzResult.secure_url;
            }

            res.json({
                message: "Models uploaded successfully",
                modelUrl: glbResult.secure_url,
                usdzUrl: usdzUrl
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
        const { name, slug, category, description, price, modelUrl, usdzUrl, available } = req.body;

if (
    typeof name !== "string" || !name.trim() ||
    typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug) ||
    typeof category !== "string" || !category.trim() ||
    typeof description !== "string" || !description.trim() ||
    !Number.isFinite(Number(price)) || Number(price) < 0 ||
    typeof modelUrl !== "string" || !modelUrl.trim() ||
    (usdzUrl !== undefined && typeof usdzUrl !== "string") ||
    (available !== undefined && typeof available !== "boolean")
) {
    return res.status(400).json({ message: "Invalid dish data." });
}

const dish = await Dish.create({
    name: name.trim(),
    slug,
    category: category.trim(),
    description: description.trim(),
    price: Number(price),
    modelUrl,
    usdzUrl: usdzUrl || "",
    available: available ?? true
});

        res.status(201).json(dish);
    }catch (error) {
    console.error(error);

    res.status(500).json({
        message: "Failed to create dish."
    });
}

    }
);

app.post(["/api/admin/login", "/admin/login"], loginLimiter, async (req, res) => {
    const isBrowserLogin = req.path === "/admin/login";
    const sendBrowserError = (status, message) => res.status(status).type("html").send(
        `<!doctype html><html lang="en"><meta charset="utf-8"><title>Admin login</title><body><main><h1>Login failed</h1><p>${message}</p><a href="/admin/login.html">Try again</a></main></body></html>`
    );
    const sendInvalidCredentials = () => {
        const attemptsRemaining = req.rateLimit ? req.rateLimit.remaining : 0;
        const message = attemptsRemaining === 0
            ? "Wrong username or password. No attempts remain; further login attempts are blocked for 15 minutes."
            : `Wrong username or password. ${attemptsRemaining} ${attemptsRemaining === 1 ? "attempt" : "attempts"} remaining before a 15-minute lockout.`;

        if (isBrowserLogin) {
            return sendBrowserError(401, message);
        }

        return res.status(401).json({ message });
    };

    try {
        const { username, password } = req.body;

        if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !username.trim() ||
    !password
) {
    if (isBrowserLogin) {
        return sendBrowserError(400, "Username and password are required.");
    }

    return res.status(400).json({
        message: "Username and password are required."
    });
}

        const admin = await Admin.findOne({ username });

        if (!admin) {
            return sendInvalidCredentials();
        }

        const passwordMatch = await bcrypt.compare(
            password,
            admin.password
        );

        if (!passwordMatch) {
            return sendInvalidCredentials();
        }

        req.session.regenerate((err) => {
    if (err) {
        console.error("Session regeneration error:", err);

        if (isBrowserLogin) {
            return sendBrowserError(500, "Server error.");
        }

        return res.status(500).json({
            message: "Server error."
        });
    }

    req.session.adminId = admin._id.toString();

    req.session.save((err) => {
        if (err) {
            console.error("Session save error:", err);

            if (isBrowserLogin) {
                return sendBrowserError(500, "Server error.");
            }

            return res.status(500).json({
                message: "Server error."
            });
        }

            if (isBrowserLogin) {
                res.redirect(303, "/admin/");
            } else {
                res.json({
                    message: "Login successful."
                });
            }
    });
});

    } catch (error) {
            console.error("Admin login error:", error);

            if (isBrowserLogin) {
                return sendBrowserError(500, "Server error.");
            }

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

        res.clearCookie("connect.sid", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
});

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