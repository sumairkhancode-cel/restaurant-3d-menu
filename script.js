const pathParts = window.location.pathname.split("/");
const slug = pathParts[pathParts.length - 1];

async function loadDish() {
    try {
        const response = await fetch(`/api/dishes/${slug}`);

        if (!response.ok) {
            throw new Error("Dish not found");
        }

        const dish = await response.json();

        document.querySelector(".category").textContent = dish.category;
        document.querySelector("h1").textContent = dish.name;
        document.title = `${dish.name} | Restaurant`;
        document.querySelector(".description").textContent =
            dish.description;
        document.querySelector(".price").textContent = `Rs. ${dish.price}`;

        const modelViewer = document.querySelector("model-viewer");
        modelViewer.src = dish.modelUrl;
        modelViewer.setAttribute("ios-src", dish.usdzUrl);
    } catch (error) {
        console.error(error);
    }
}

loadDish();
