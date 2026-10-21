import app, { initializeRoutes } from "./app";

const PORT = Number(process.env.PORT ?? 3000);

async function startServer(): Promise<void> {
  try {
    await initializeRoutes();

    app.listen(PORT, () => {
      console.log(`🚀 API Medication ejecutándose en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar la API:", error);
    process.exit(1);
  }
}

startServer();