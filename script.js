async function loadDish() {
    const viewerMessage = document.querySelector(".viewer-message");
    const modelViewer = document.querySelector("model-viewer");
    const whatsappButton = modelViewer.querySelector(".whatsapp-ar-button");
    const whatsappOrderLinks = document.querySelectorAll(".whatsapp-order-button");
    const whatsappFallbackButton = document.querySelector(".whatsapp-fallback-button");
    let isARActive = false;
    let hasWhatsAppNumber = false;

    const updateWhatsAppButtonVisibility = () => {
        whatsappButton.hidden = !isARActive || !hasWhatsAppNumber;
        whatsappFallbackButton.hidden = isARActive || !hasWhatsAppNumber;
    };

    modelViewer.addEventListener("ar-status", (event) => {
        isARActive = event.detail.status === "session-started" ||
            event.detail.status === "object-placed";
        updateWhatsAppButtonVisibility();
    });

    if (viewerMessage) {
        viewerMessage.textContent = "Loading dish...";
    }

    try {
        const isHomePage = window.location.pathname === "/";
        const slug = window.location.pathname.split("/").filter(Boolean).pop();
        const response = await fetch(
            isHomePage ? "/api/dishes" : `/api/dishes/${encodeURIComponent(slug)}`
        );

        if (!response.ok) {
            throw new Error("Dish not found");
        }

        const responseData = await response.json();
        const dish = Array.isArray(responseData) ? responseData[0] : responseData;

        if (!dish) {
            throw new Error("No dishes are currently available.");
        }

        document.querySelector(".category").textContent = dish.category;
        document.querySelector("h1").textContent = dish.name;
        document.title = `${dish.name} | Restaurant`;
        document.querySelector(".description").textContent =
            dish.description;
        document.querySelector(".price").textContent = `Rs. ${dish.price}`;

        modelViewer.src = dish.modelUrl;
        modelViewer.alt = `3D model of ${dish.name}`;
        modelViewer.setAttribute("ios-src", dish.usdzUrl);

        const whatsappResponse = await fetch("/api/whatsapp");
        const whatsappConfig = await whatsappResponse.json();
        if (!whatsappResponse.ok) {
            throw new Error(whatsappConfig.message || "WhatsApp ordering is unavailable.");
        }

        if (typeof whatsappConfig.number !== "string" ||
            !/^\d{7,15}$/.test(whatsappConfig.number)) {
            throw new Error("The configured WhatsApp number is invalid.");
        }

        const message = `Hi, I would like to order ${dish.name}.`;
        const whatsappUrl =
            `https://wa.me/${whatsappConfig.number}?text=${encodeURIComponent(message)}`;
        whatsappOrderLinks.forEach((link) => {
            link.href = whatsappUrl;
        });
        hasWhatsAppNumber = true;
        updateWhatsAppButtonVisibility();

        if (viewerMessage) {
            viewerMessage.textContent = "";
        }
    } catch (error) {
        console.error(error);

        if (viewerMessage) {
            viewerMessage.textContent = error.message || "Unable to load this dish.";
        }
    }
}

loadDish();
