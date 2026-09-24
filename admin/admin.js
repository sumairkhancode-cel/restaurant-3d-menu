const form = document.querySelector("#dish-form");
const message = document.querySelector("#message");
let editingDishId = null;
let editingModelUrl = null;
const submitButton = form.querySelector("button[type='submit']");
const cancelButton = document.querySelector("#cancel-edit");
const logoutButton = document.getElementById("logout-button");

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

  const modelFile = document.querySelector("#model").files[0];

let modelUrl = editingModelUrl;

if (modelFile) {
    const formData = new FormData();

    formData.append("model", modelFile);

    const uploadResponse = await fetch("/api/upload-model", {
        method: "POST",
        body: formData
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok) {
        throw new Error(
            uploadResult.message || "Failed to upload model"
        );
    }

    modelUrl = uploadResult.modelUrl;
}

const dish = {
    name: document.querySelector("#name").value,
    slug: document.querySelector("#slug").value,
    category: document.querySelector("#category").value,
    description: document.querySelector("#description").value,
    price: Number(document.querySelector("#price").value),
    modelUrl:modelUrl,
    available: document.querySelector("#available").checked
};

    try {
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
        submitButton.textContent = "Add Dish";
        document.querySelector("#available").checked = true;

        console.log(result);
    } catch (error) {
        message.textContent = error.message;
        console.error(error);
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

        dishList.innerHTML = "";

        dishes.forEach((dish) => {
            const dishItem = document.createElement("div");

            dishItem.className = "admin-dish";

            dishItem.innerHTML = `
    <div class="dish-details">

        <h3>${dish.name}</h3>

        <p>${dish.category}</p>

        <p>Rs. ${dish.price}</p>

        <p>Status: ${dish.available ? "Available" : "Unavailable"}</p>

        <a href="/food/${dish.slug}" target="_blank">
            Open Dish
        </a>

        <div class="dish-actions">
            <button class="edit-button" data-id="${dish._id}">
                Edit
            </button>

            <button class="delete-button" data-id="${dish._id}">
                Delete
            </button>
        </div>

    </div>

    <div class="qr-section">

        <div class="qr-code" id="qr-${dish._id}"></div>

    </div>
`;

            dishList.appendChild(dishItem);
            const qrContainer = dishItem.querySelector(`#qr-${dish._id}`);

new QRCode(qrContainer, {
    text: `${window.location.origin}/food/${dish.slug}`,
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
            window.location.href = "/admin/login.html";
        } else {
            alert("Logout failed.");
        }

    } catch (error) {
        console.error("Logout error:", error);
        alert("Something went wrong while logging out.");
    }
});