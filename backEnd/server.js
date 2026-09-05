const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();

const multer = require("multer");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connecté"))
  .catch((err) => console.error("Erreur MongoDB :", err));

const Contact = mongoose.model("Contact", new mongoose.Schema({
  nom: String,
  email: String,
  categorie: String,
  message: String,
}, { timestamps: true }));

const Newsletter = mongoose.model("Newsletter", new mongoose.Schema({
  email: { type: String, required: true, unique: true },
}, { timestamps: true }));

const Publication = mongoose.model("Publication", new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["actualite", "immobilier", "annonce", "emploi", "service"],
  },
  titre: String,
  ville: String,
  prix: String,
  description: String,
  badge: String,
  image: String,
}, { timestamps: true }));

function verifierAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token manquant" });
  }

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ message: "Token invalide" });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });


app.get("/", (req, res) => {
  res.send("Backend DzServices fonctionne");
});

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    return res.json({ message: "Connexion réussie", token });
  }

  res.status(401).json({ message: "Email ou mot de passe incorrect" });
});

app.post("/api/contact", async (req, res) => {
  try {
    const { nom, email, categorie, message } = req.body;

    if (!nom || !email || !message) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    await Contact.create({ nom, email, categorie, message });

    res.status(201).json({ message: "Message envoyé avec succès" });
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/api/newsletter", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email obligatoire" });
    }

    await Newsletter.create({ email });

    res.status(201).json({ message: "Inscription newsletter réussie" });
  } catch {
    res.status(400).json({ message: "Email déjà inscrit ou invalide" });
  }
});

app.get("/api/publications/:type", async (req, res) => {
  try {
    const publications = await Publication.find({ type: req.params.type }).sort({
      createdAt: -1,
    });

    res.json(publications);
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
});
app.get("/api/publications/detail/:id", async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);

    if (!publication) {
      return res.status(404).json({ message: "Publication introuvable" });
    }

    res.json(publication);
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
});
app.post("/api/admin/publications", verifierAdmin, upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

    const publication = await Publication.create({
      type: req.body.type,
      badge: req.body.badge,
      titre: req.body.titre,
      ville: req.body.ville,
      prix: req.body.prix,
      description: req.body.description,
      image: imagePath,
    });

    res.status(201).json({
      message: "Publication ajoutée avec succès",
      publication,
    });
  } catch {
    res.status(500).json({ message: "Erreur lors de l’ajout" });
  }
});

app.delete("/api/admin/publications/:id", verifierAdmin, async (req, res) => {
  try {
    await Publication.findByIdAndDelete(req.params.id);
    res.json({ message: "Publication supprimée" });
  } catch {
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
});
app.put("/api/admin/publications/:id", verifierAdmin, upload.single("image"), async (req, res) => {
  try {
    const data = {
      type: req.body.type,
      badge: req.body.badge,
      titre: req.body.titre,
      ville: req.body.ville,
      prix: req.body.prix,
      description: req.body.description,
    };

    if (req.file) {
      data.image = `/uploads/${req.file.filename}`;
    }

    const publication = await Publication.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true }
    );

    res.json({
      message: "Publication modifiée avec succès",
      publication,
    });
  } catch {
    res.status(500).json({ message: "Erreur lors de la modification" });
  }
});

app.get("/api/admin/contacts", verifierAdmin, async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch {
    res.status(500).json({ message: "Erreur chargement messages" });
  }
});

app.delete("/api/admin/contacts/:id", verifierAdmin, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: "Message supprimé" });
  } catch {
    res.status(500).json({ message: "Erreur suppression message" });
  }
});

app.get("/api/admin/newsletters", verifierAdmin, async (req, res) => {
  try {
    const emails = await Newsletter.find().sort({ createdAt: -1 });
    res.json(emails);
  } catch {
    res.status(500).json({ message: "Erreur chargement newsletter" });
  }
});

app.delete("/api/admin/newsletters/:id", verifierAdmin, async (req, res) => {
  try {
    await Newsletter.findByIdAndDelete(req.params.id);
    res.json({ message: "Email supprimé" });
  } catch {
    res.status(500).json({ message: "Erreur suppression email" });
  }
});
app.listen(process.env.PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${process.env.PORT}`);
});
