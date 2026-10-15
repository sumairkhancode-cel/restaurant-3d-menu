const form = document.querySelector("#dish-form");
const message = document.querySelector("#message");
let editingDishId = null;
let editingModelUrl = null;
let editingUsdzUrl = "";
const submitButton = form.querySelector("button[type='submit']");
const cancelButton = document.querySelector("#cancel-edit");
const logoutButton = document.getElementById("logout-button");

window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        window.location.reload();
    }
});

window.addEventListener("pagehide", () => {
    if (typeof navigator.sendBeacon === "function" &&
        navigator.sendBeacon("/api/admin/logout")) {
        return;
    }

    fetch("/api/admin/logout", {
        method: "POST",
        keepalive: true
    }).catch((error) => {
        console.error("Admin session logout on page exit failed:", error);
    });
});

cancelButton.style.display = "none";
const nameInput = document.querySelector("#name");
const slugInput = document.querySelector("#slug");

nameInput.addEventListener("input", () => {
    slugInput.value = nameInput.value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
  const modelFile = document.querySelector("#model").files[0];
  const usdzFile = document.querySelector("#usdz").files[0];

if (modelFile && !modelFile.name.toLowerCase().endsWith(".glb")) {
    alert("Only .glb files are accepted for the 3D model.");
    return;
}

if (usdzFile && !usdzFile.name.toLowerCase().endsWith(".usdz")) {
    alert("Only .usdz files are accepted for the iPhone AR model.");
    return;
}

const isEditing = Boolean(editingDishId);
submitButton.disabled = true;
submitButton.textContent = isEditing ? "Updating Dish..." : "Adding Dish...";
message.textContent = isEditing ? "Updating dish..." : "Adding dish...";

let modelUrl = editingModelUrl;
let usdzUrl = editingUsdzUrl;

if (modelFile) {
    const formData = new FormData();

    formData.append("model", modelFile);
    if (usdzFile) {
    formData.append("usdz", usdzFile);
}

    const uploadResponse = await fetch("/api/upload-model", {
        method: "POST",
        body: formData
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok) {
        const errorMessage = uploadResult.message || "Model upload failed.";
        message.textContent = errorMessage;
        alert(errorMessage);
        return;
    }

    modelUrl = uploadResult.modelUrl;
    if (uploadResult.usdzUrl) {
    usdzUrl = uploadResult.usdzUrl;
}
}

const dish = {
    name: document.querySelector("#name").value,
    slug: document.querySelector("#slug").value,
    category: document.querySelector("#category").value,
    description: document.querySelector("#description").value,
    price: Number(document.querySelector("#price").value),
    modelUrl:modelUrl,
    usdzUrl: usdzUrl,
    available: document.querySelector("#available").checked
};

        const url = editingDishId
    ? `/api/dishes/${editingDishId}`
    : "/api/dishes";

const method = editingDishId ? "PUT" : "POST";

const response = await fetch(url, {
    method: method,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(dish)
});

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to add dish");
        }

        message.textContent = editingDishId
    ? "Dish updated successfully!"
    : "Dish added successfully!";

        form.reset();
        editingDishId = null;
        editingModelUrl = null;
        editingUsdzUrl = "";
        submitButton.textContent = "Add Dish";
        document.querySelector("#available").checked = true;

        await loadDishes();
        console.log(result);
    } catch (error) {
        message.textContent = error.message;
        console.error(error);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = editingDishId ? "Update Dish" : "Add Dish";
    }
});
async function loadDishes() {
    const dishList = document.querySelector("#dish-list");

    try {
        const response = await fetch("/api/dishes");

        if (!response.ok) {
            throw new Error("Failed to load dishes");
        }

        const dishes = await response.json();

        dishList.replaceChildren();

        dishes.forEach((dish) => {
            const dishItem = document.createElement("div");
            dishItem.className = "admin-dish";

            const dishDetails = document.createElement("div");
            dishDetails.className = "dish-details";

            const name = document.createElement("h3");
            name.textContent = dish.name;
            dishDetails.appendChild(name);

            const category = document.createElement("p");
            category.textContent = dish.category;
            dishDetails.appendChild(category);

            const price = document.createElement("p");
            price.textContent = `Rs. ${dish.price}`;
            dishDetails.appendChild(price);

            const status = document.createElement("p");
            status.textContent = `Status: ${dish.available ? "Available" : "Unavailable"}`;
            dishDetails.appendChild(status);

            const dishUrl = `/food/${encodeURIComponent(dish.slug)}`;
            const dishLink = document.createElement("a");
            dishLink.href = dishUrl;
            dishLink.target = "_blank";
            dishLink.rel = "noopener noreferrer";
            dishLink.textContent = "Open Dish";
            dishDetails.appendChild(dishLink);

            const actions = document.createElement("div");
            actions.className = "dish-actions";

            const editButton = document.createElement("button");
            editButton.className = "edit-button";
            editButton.dataset.id = dish._id;
            editButton.textContent = "Edit";
            actions.appendChild(editButton);

            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-button";
            deleteButton.dataset.id = dish._id;
            deleteButton.textContent = "Delete";
            actions.appendChild(deleteButton);

            dishDetails.appendChild(actions);
            dishItem.appendChild(dishDetails);

            const qrSection = document.createElement("div");
            qrSection.className = "qr-section";

            const qrContainer = document.createElement("div");
            qrContainer.className = "qr-code";
            qrSection.appendChild(qrContainer);
            dishItem.appendChild(qrSection);

            dishList.appendChild(dishItem);

new QRCode(qrContainer, {
    text: `${window.location.origin}${dishUrl}`,
    width: 150,
    height: 150
});
const downloadButton = document.createElement("button");

downloadButton.textContent = "Download QR";
downloadButton.className = "download-qr-button";

downloadButton.addEventListener("click", () => {
    const canvas = qrContainer.querySelector("canvas");

    if (!canvas) {
        return;
    }

    const link = document.createElement("a");

    link.download = `${dish.slug}-qr.png`;
    link.href = canvas.toDataURL("image/png");

    link.click();
});

qrContainer.after(downloadButton);
        });
    } catch (error) {
        console.error("Failed to load dishes:", error);
    }
}

loadDishes();

document.querySelector("#dish-list").addEventListener("click", async (event) => {
    const button = event.target;

    if (button.classList.contains("edit-button")) {
    const id = button.dataset.id;

    try {
        const response = await fetch("/api/dishes");

        if (!response.ok) {
            throw new Error("Failed to load dishes");
        }

        const dishes = await response.json();

        const dish = dishes.find((item) => item._id === id);

        if (!dish) {
            throw new Error("Dish not found");
        }

        document.querySelector("#name").value = dish.name;
        document.querySelector("#slug").value = dish.slug;
        document.querySelector("#category").value = dish.category;
        document.querySelector("#description").value = dish.description;
        document.querySelector("#price").value = dish.price;
        document.querySelector("#available").checked = dish.available;

        editingModelUrl = dish.modelUrl;
        editingUsdzUrl = dish.usdzUrl;
        editingDishId = dish._id;
        submitButton.textContent = "Update Dish";
        cancelButton.style.display = "block";

        document.querySelector("#name").focus();

        message.textContent = "Editing dish...";
    } catch (error) {
        console.error(error);
        message.textContent = "Failed to load dish.";
    }
}

    if (button.classList.contains("delete-button")) {
        const id = button.dataset.id;

        const confirmed = confirm(
            "Are you sure you want to delete this dish?"
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/dishes/${id}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Failed to delete dish");
            }

            loadDishes();
        } catch (error) {
            console.error(error);
            alert("Failed to delete dish.");
        }
    }
});
cancelButton.addEventListener("click", () => {
    form.reset();

    document.querySelector("#available").checked = true;

    editingDishId = null;
    editingModelUrl = null;
    editingUsdzUrl = "";

    submitButton.textContent = "Add Dish";

    cancelButton.style.display = "none";

    message.textContent = "";
});
logoutButton.addEventListener("click", async () => {
    try {
        const response = await fetch("/api/admin/logout", {
            method: "POST"
        });

        if (response.ok) {
            window.location.replace("/admin/login.html");
        } else {
            alert("Logout failed.");
        }

    } catch (error) {
        console.error("Logout error:", error);
        alert("Something went wrong while logging out.");
    }
});