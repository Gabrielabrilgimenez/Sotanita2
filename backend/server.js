const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// --- Cloudinary Config ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' });

function cleanupUploadedFiles(files = []) {
    files.forEach((file) => {
        if (file?.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    });
}

// --- Upload Route ---
app.post('/api/videos', upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 12 },
]), async (req, res) => {
    let files = [];
    try {
        const { title, category, description, id_usuario } = req.body;
        files = [
            ...(req.files?.file || []),
            ...(req.files?.files || []),
        ];

        if (!files.length || !title || !category || !id_usuario) {
            cleanupUploadedFiles(files);
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const uploadedUrls = [];
        for (const file of files) {
            const result = await cloudinary.uploader.upload(file.path, {
                resource_type: 'auto',
                folder: 'videos_app',
            });
            uploadedUrls.push(result.secure_url);
        }

        cleanupUploadedFiles(files);

        const primaryUrl = uploadedUrls[0];
        const mediaType = files.length > 1
            ? 'carousel'
            : (files[0]?.mimetype || '').startsWith('image/')
                ? 'image'
                : 'video';

        // Guardar en MongoDB
        const videoDoc = {
            url: primaryUrl,
            mediaUrls: uploadedUrls,
            mediaType,
            title,
            category,
            description,
            id_usuario,
            likes: 0,
            likedBy: [],
            createdAt: new Date()
        };

        const insertResult = await db.collection('videos').insertOne(videoDoc);

        res.status(201).json({
            id: insertResult.insertedId.toString(),
            url: primaryUrl,
            mediaUrls: uploadedUrls,
            mediaType,
            title,
            category,
            description,
            id_usuario,
            likes: 0,
            likedBy: [],
            createdAt: videoDoc.createdAt.toISOString()
        });

    } catch (error) {
        cleanupUploadedFiles(files);
        console.error('Error al subir video:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// --- Get Videos Route ---
app.get('/api/videos', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const categoryRaw = String(req.query.category || '').trim();

        const pipeline = [];

        if (categoryRaw) {
            pipeline.push({ $match: { category: buildNameRegex(categoryRaw) } });
        }

        pipeline.push(
            { $sort: { createdAt: -1 } },
            { $skip: offset },
            { $limit: limit },
            { $addFields: { videoIdStr: { $toString: '$_id' } } },
            {
                $lookup: {
                    from: 'comentarios',
                    localField: 'videoIdStr',
                    foreignField: 'videoId',
                    as: 'comments',
                },
            },
            { $addFields: { commentsCount: { $size: '$comments' } } },
            { $addFields: { uploaderKey: { $toLower: { $ifNull: ['$id_usuario', ''] } } } },
            {
                $lookup: {
                    from: 'perfiles',
                    let: { uploaderKey: '$uploaderKey' },
                    pipeline: [
                        { $addFields: { emailKey: { $toLower: '$email' } } },
                        { $match: { $expr: { $eq: ['$emailKey', '$$uploaderKey'] } } },
                        { $project: { password: 0, emailKey: 0 } },
                    ],
                    as: 'uploader',
                },
            },
            { $addFields: { uploader: { $first: '$uploader' } } },
            { $project: { comments: 0, videoIdStr: 0, uploaderKey: 0 } },
        );

        const videos = await db.collection('videos').aggregate(pipeline).toArray();

        const enriched = await Promise.all(videos.map(async (video) => {
            let uploaderCard = null;

            if (video?.uploader) {
                const cardData = await resolveCardData(video.uploader.teamId, video.uploader.frameId);
                uploaderCard = {
                    username: video.uploader.username,
                    position: video.uploader.position,
                    teamName: cardData.teamName,
                    teamImageUrl: cardData.teamImageUrl,
                    frameImageId: cardData.frameImageId,
                    profileImageUrl: video.uploader.profileImageUrl ?? null,
                };
            }

            const sanitized = { ...video };
            delete sanitized.uploader;

            return {
                ...sanitized,
                uploaderCard,
                id: video._id.toString(),
                _id: undefined,
            };
        }));

        res.json(enriched);
    } catch (error) {
        console.error('Error al obtener videos:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

app.get('/api/videos/categories', async (req, res) => {
    try {
        const rawCategories = await db.collection('videos').distinct('category');
        const categoriesMap = new Map();

        rawCategories.forEach((value) => {
            const trimmed = String(value ?? '').trim();
            if (!trimmed) return;
            const key = trimmed.toLowerCase();
            if (!categoriesMap.has(key)) {
                categoriesMap.set(key, trimmed);
            }
        });

        const categories = Array.from(categoriesMap.values()).sort((a, b) =>
            a.localeCompare(b, 'es', { sensitivity: 'base' })
        );

        return res.json({ categories });
    } catch (error) {
        console.error('Error al obtener categorias de videos:', error);
        return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

app.get('/api/categorias', async (req, res) => {
    try {
        const rows = await db.collection('categorias').find({}, { projection: { _id: 0 } }).toArray();
        const categoriesMap = new Map();

        rows.forEach((row) => {
            const candidate = typeof row === 'string'
                ? row
                : row?.name ?? row?.nombre ?? row?.title ?? row?.titulo ?? row?.category ?? row?.categoria ?? row?.label;

            const trimmed = String(candidate ?? '').trim();
            if (!trimmed) return;

            const key = trimmed.toLowerCase();
            if (!categoriesMap.has(key)) {
                categoriesMap.set(key, trimmed);
            }
        });

        const categories = Array.from(categoriesMap.values()).sort((a, b) =>
            a.localeCompare(b, 'es', { sensitivity: 'base' })
        );

        return res.json({ categories });
    } catch (error) {
        console.error('Error al obtener categorias:', error);
        return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

app.get('/api/posiciones', async (req, res) => {
    try {
        const rows = await db.collection('posiciones').find({}, { projection: { _id: 0 } }).toArray();
        const positionsMap = new Map();

        rows.forEach((row) => {
            const candidate = typeof row === 'string'
                ? row
                : row?.name ?? row?.nombre ?? row?.title ?? row?.titulo ?? row?.position ?? row?.posicion ?? row?.label;

            const trimmed = String(candidate ?? '').trim();
            if (!trimmed) return;

            const key = trimmed.toLowerCase();
            if (!positionsMap.has(key)) {
                positionsMap.set(key, trimmed);
            }
        });

        const posiciones = Array.from(positionsMap.values()).sort((a, b) =>
            a.localeCompare(b, 'es', { sensitivity: 'base' })
        );

        return res.json({ posiciones });
    } catch (error) {
        console.error('Error al obtener posiciones:', error);
        return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

app.get('/api/videos/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'id de video invalido' });
        }

        const comments = await db.collection('comentarios')
            .find({ videoId: id })
            .sort({ createdAt: -1 })
            .toArray();

        const enrichedComments = await Promise.all(comments.map(async (comment) => {
            const authorEmail = String(comment.userId || '').trim().toLowerCase();
            let authorProfile = null;

            if (authorEmail) {
                authorProfile = await db.collection('perfiles').findOne({ email: authorEmail });
            }

            const cardData = authorProfile
                ? await resolveCardData(authorProfile.teamId, authorProfile.frameId)
                : { teamName: null, teamImageUrl: null, frameImageId: null };

            return {
                ...comment,
                authorUsername: authorProfile?.username || comment.username || authorEmail.split('@')[0] || 'usuario',
                authorProfileImageUrl: authorProfile?.profileImageUrl || null,
                authorTeamName: cardData.teamName,
                authorTeamImageUrl: cardData.teamImageUrl,
                authorFrameImageId: cardData.frameImageId,
                id: comment._id.toString(),
                _id: undefined,
            };
        }));

        return res.json(enrichedComments);
    } catch (error) {
        console.error('Error al obtener comentarios:', error);
        return res.status(500).json({ message: 'Error interno del servidor', details: error.message });
    }
});

app.post('/api/videos/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'id de video invalido' });
        }

        const { id_usuario, type, text, audioUrl } = req.body || {};
        const normalizedUser = String(id_usuario || '').trim().toLowerCase();
        const normalizedType = String(type || '').trim().toLowerCase();

        if (!normalizedUser) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        if (normalizedType !== 'text' && normalizedType !== 'audio') {
            return res.status(400).json({ message: 'type invalido' });
        }

        if (normalizedType === 'text' && !String(text || '').trim()) {
            return res.status(400).json({ message: 'text es obligatorio' });
        }

        if (normalizedType === 'audio' && !String(audioUrl || '').trim()) {
            return res.status(400).json({ message: 'audioUrl es obligatorio' });
        }

        const commentDoc = {
            videoId: id,
            userId: normalizedUser,
            type: normalizedType,
            text: normalizedType === 'text' ? String(text).trim() : null,
            audioUrl: normalizedType === 'audio' ? String(audioUrl).trim() : null,
            createdAt: new Date(),
        };

        const insertResult = await db.collection('comentarios').insertOne(commentDoc);

        return res.status(201).json({
            id: insertResult.insertedId.toString(),
            ...commentDoc,
            createdAt: commentDoc.createdAt.toISOString(),
        });
    } catch (error) {
        console.error('Error al crear comentario:', error);
        return res.status(500).json({ message: 'Error interno del servidor', details: error.message });
    }
});

// --- Foros (team forums) ---
app.get('/api/foros/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) return res.status(400).json({ message: 'teamId es obligatorio' });

        // Return messages sorted ascending (oldest first) so newest appear at the bottom in the chat
        const msgs = await db.collection('foros')
            .find({ team: teamId })
            .sort({ date: 1 })
            .toArray();

        // Enrich each message: resolve current username from perfiles using stored user (email)
        const enriched = await Promise.all(msgs.map(async (m) => {
            const storedUser = String(m.user || '').trim();
            const maybeEmail = storedUser.includes('@') ? storedUser.toLowerCase() : null;

            let resolvedUsername = storedUser;
            let profileImageUrl = null;

            if (maybeEmail) {
                const profile = await db.collection('perfiles').findOne({ email: maybeEmail });
                if (profile) {
                    resolvedUsername = profile.username || (maybeEmail.split('@')[0]);
                    profileImageUrl = profile.profileImageUrl || null;
                } else {
                    resolvedUsername = maybeEmail.split('@')[0];
                }
            } else {
                // stored value is not an email (legacy) - try to resolve by username
                const profile = await db.collection('perfiles').findOne({ username: storedUser }, { collation: { locale: 'es', strength: 2 } });
                if (profile) {
                    resolvedUsername = profile.username;
                    profileImageUrl = profile.profileImageUrl || null;
                }
            }

            return {
                ...m,
                id: m._id.toString(),
                _id: undefined,
                user: resolvedUsername,
                userEmail: maybeEmail,
                profileImageUrl,
            };
        }));

        return res.json(enriched);
    } catch (err) {
        console.error('Error GET /api/foros/:teamId', err.message);
        return res.status(500).json({ message: 'Error obteniendo foro' });
    }
});

app.post('/api/foros/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;
        const { user, type, text, audioUrl } = req.body || {};

        if (!teamId) return res.status(400).json({ message: 'teamId es obligatorio' });
        if (!user) return res.status(400).json({ message: 'user es obligatorio' });
        if (!type || (type !== 'text' && type !== 'audio')) return res.status(400).json({ message: 'type invalido' });
        if (type === 'text' && (!text || String(text).trim().length === 0)) return res.status(400).json({ message: 'text es obligatorio para type=text' });
        if (type === 'text' && String(text).length > 500) return res.status(400).json({ message: 'text supera 500 caracteres' });

        // Normalize user identifier: prefer email (lowercased) when present
        const rawUser = String(user || '').trim();
        const normalizedUser = rawUser.includes('@') ? rawUser.toLowerCase() : rawUser;

        const doc = {
            user: normalizedUser,
            team: teamId,
            type,
            audioUrl: type === 'audio' ? (audioUrl || null) : null,
            text: type === 'text' ? String(text).trim() : null,
            date: new Date(),
        };

        const result = await db.collection('foros').insertOne(doc);
        const created = await db.collection('foros').findOne({ _id: result.insertedId });
        return res.status(201).json({ ...created, id: created._id.toString(), _id: undefined });
    } catch (err) {
        console.error('Error POST /api/foros/:teamId', err.message);
        return res.status(500).json({ message: 'Error creando mensaje de foro' });
    }
});

app.delete('/api/comments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userIdRaw = String(req.body?.id_usuario || req.query?.id_usuario || '').trim().toLowerCase();

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'id de comentario invalido' });
        }

        if (!userIdRaw) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const commentObjectId = new ObjectId(id);
        const comment = await db.collection('comentarios').findOne({ _id: commentObjectId });

        if (!comment) {
            return res.status(404).json({ message: 'Comentario no encontrado' });
        }

        if (String(comment.userId || '').trim().toLowerCase() !== userIdRaw) {
            return res.status(403).json({ message: 'No tienes permiso para eliminar este comentario' });
        }

        await db.collection('comentarios').deleteOne({ _id: commentObjectId });

        return res.json({ success: true, id });
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        return res.status(500).json({ message: 'Error interno del servidor', details: error.message });
    }
});

app.post('/api/uploads/audio', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'file es obligatorio' });
        }

        const result = await cloudinary.uploader.upload(file.path, {
            resource_type: 'video',
            folder: 'audio_comments',
        });

        fs.unlinkSync(file.path);

        return res.status(201).json({ url: result.secure_url });
    } catch (error) {
        console.error('Error al subir audio:', error);
        return res.status(500).json({ message: 'Error interno del servidor', details: error.message });
    }
});

app.post('/api/videos/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        const userIdRaw = String(req.body?.id_usuario || '').trim().toLowerCase();

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'id de video invalido' });
        }

        if (!userIdRaw) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const videoObjectId = new ObjectId(id);

        const result = await db.collection('videos').updateOne(
            { _id: videoObjectId, likedBy: { $ne: userIdRaw } },
            {
                $inc: { likes: 1 },
                $addToSet: { likedBy: userIdRaw },
            }
        );

        const video = await db.collection('videos').findOne({ _id: videoObjectId });
        if (!video) {
            return res.status(404).json({ message: 'Video no encontrado' });
        }

        const alreadyLiked = result.modifiedCount === 0;

        // Crear notificacion en cada like nuevo.
        const ownerUserId = String(video.id_usuario || '').trim().toLowerCase();
        if (!alreadyLiked) {
            const recipientUserId = ownerUserId || userIdRaw;
            const videoTitle = String(video.title || 'video').trim();

            await db.collection('notificaciones').insertOne({
                videoId: video._id.toString(),
                videoTitle,
                actorUserId: userIdRaw,
                recipientUserId,
                type: 'like',
                read: false,
                createdAt: new Date(),
            });
        }

        return res.json({
            id: video._id.toString(),
            likes: Number(video.likes || 0),
            liked: true,
            alreadyLiked,
        });
    } catch (error) {
        console.error('Error al dar like:', error);
        return res.status(500).json({ message: 'Error interno del servidor', details: error.message });
    }
});

app.get('/api/notificaciones', async (req, res) => {
    try {
        const userIdRaw = String(req.query?.id_usuario || '').trim().toLowerCase();
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = parseInt(req.query.offset, 10) || 0;

        if (!userIdRaw) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const notifications = await db.collection('notificaciones')
            .find({ recipientUserId: userIdRaw })
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .toArray();

        const enrichedNotifications = await Promise.all(notifications.map(async (n) => {
            const actorEmail = String(n.actorUserId || '').trim().toLowerCase();
            let actorProfile = null;

            if (actorEmail) {
                actorProfile = await db.collection('perfiles').findOne({ email: actorEmail });
            }

            const actorUsername = actorProfile?.username || actorEmail.split('@')[0] || 'usuario';
            const cardData = actorProfile
                ? await resolveCardData(actorProfile.teamId, actorProfile.frameId)
                : { teamName: null, teamImageUrl: null, frameImageId: null };

            const videoTitle = String(n.videoTitle || 'video').trim();
            const dynamicMessage = `${actorUsername} le ha dado me gusta a tu video: ${videoTitle}`;

            return {
                ...n,
                actorUsername,
                message: dynamicMessage,
                actorProfileImageUrl: actorProfile?.profileImageUrl || null,
                actorTeamName: cardData.teamName,
                actorTeamImageUrl: cardData.teamImageUrl,
                actorFrameImageId: cardData.frameImageId,
                id: n._id.toString(),
                _id: undefined,
            };
        }));

        return res.json(enrichedNotifications);
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        return res.status(500).json({ message: 'Error interno del servidor', details: error.message });
    }
});

app.get('/api/notificaciones/unread-count', async (req, res) => {
    try {
        const userIdRaw = String(req.query?.id_usuario || '').trim().toLowerCase();

        if (!userIdRaw) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const count = await db.collection('notificaciones').countDocuments({
            recipientUserId: userIdRaw,
            read: { $ne: true },
        });

        return res.json({ unreadCount: count });
    } catch (error) {
        console.error('Error al contar notificaciones:', error);
        return res.status(500).json({ message: 'Error interno del servidor', details: error.message });
    }
});

app.post('/api/notificaciones/mark-read', async (req, res) => {
    try {
        const userIdRaw = String(req.body?.id_usuario || '').trim().toLowerCase();

        if (!userIdRaw) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const result = await db.collection('notificaciones').updateMany(
            { recipientUserId: userIdRaw, read: { $ne: true } },
            { $set: { read: true } }
        );

        return res.json({ updated: result.modifiedCount || 0 });
    } catch (error) {
        console.error('Error al marcar notificaciones como leidas:', error);
        return res.status(500).json({ message: 'Error interno del servidor', details: error.message });
    }
});

app.delete('/api/notificaciones', async (req, res) => {
    try {
        const userIdRaw = String(req.body?.id_usuario || '').trim().toLowerCase();

        if (!userIdRaw) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const result = await db.collection('notificaciones').deleteMany({
            recipientUserId: userIdRaw,
        });

        return res.json({ deleted: result.deletedCount || 0 });
    } catch (error) {
        console.error('Error al eliminar notificaciones:', error);
        return res.status(500).json({ message: 'Error interno del servidor', details: error.message });
    }
});

app.post('/api/videos/:id/unlike', async (req, res) => {
    try {
        const { id } = req.params;
        const userIdRaw = String(req.body?.id_usuario || '').trim().toLowerCase();

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'id de video invalido' });
        }

        if (!userIdRaw) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const videoObjectId = new ObjectId(id);

        const result = await db.collection('videos').updateOne(
            { _id: videoObjectId, likedBy: userIdRaw },
            {
                $inc: { likes: -1 },
                $pull: { likedBy: userIdRaw },
            }
        );

        // Protección adicional ante datos legacy inconsistentes.
        await db.collection('videos').updateOne(
            { _id: videoObjectId, likes: { $lt: 0 } },
            { $set: { likes: 0 } }
        );

        const video = await db.collection('videos').findOne({ _id: videoObjectId });
        if (!video) {
            return res.status(404).json({ message: 'Video no encontrado' });
        }

        const alreadyUnliked = result.modifiedCount === 0;

        return res.json({
            id: video._id.toString(),
            likes: Number(video.likes || 0),
            liked: false,
            alreadyUnliked,
        });
    } catch (error) {
        console.error('Error al quitar like:', error);
        return res.status(500).json({ message: 'Error interno del servidor', details: error.message });
    }
});

app.delete('/api/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userIdRaw = String(req.body?.id_usuario || req.query?.id_usuario || '').trim().toLowerCase();

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'id de video invalido' });
        }

        if (!userIdRaw) {
            return res.status(400).json({ message: 'id_usuario es obligatorio' });
        }

        const videoObjectId = new ObjectId(id);
        const video = await db.collection('videos').findOne({ _id: videoObjectId });

        if (!video) {
            return res.status(404).json({ message: 'Video no encontrado' });
        }

        const ownerId = String(video.id_usuario || '').trim().toLowerCase();
        if (ownerId !== userIdRaw) {
            return res.status(403).json({ message: 'No tienes permiso para eliminar este video' });
        }

        await db.collection('videos').deleteOne({ _id: videoObjectId });

        return res.json({
            success: true,
            id: id,
            message: 'Video eliminado correctamente',
        });
    } catch (error) {
        console.error('Error al eliminar video:', error);
        return res.status(500).json({ message: 'Error interno del servidor', details: error.message });
    }
});

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error("❌ Falta la variable MONGO_URI en backend/.env");
    process.exit(1);
}

const client = new MongoClient(mongoUri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

const PORT = process.env.PORT || 5000;
const DB_NAME = process.env.MONGO_DB_NAME || 'sotanitapp';

let db;

const createUserSchema = z.object({
    username: z.string()
        .min(3, 'Username debe tener al menos 3 caracteres')
        .max(10, 'Username no puede superar 10 caracteres')
        .regex(/^[a-zA-Z0-9.\-]+$/, 'Username solo puede contener letras, numeros, "." y "-"')
        .refine(
            (username) => /[a-zA-Z]/.test(username),
            'Username debe contener al menos una letra'
        ),
    email: z.string()
        .email('Email invalido')
        .refine(
            (email) => {
                // Basic real email validation - must have common TLD
                const parts = email.split('@');
                if (parts.length !== 2) return false;
                const domain = parts[1];
                return /\.[a-z]{2,}$/i.test(domain);
            },
            'Email debe ser un email valido y real'
        ),
    password: z.string()
        .min(8, 'Contrasena debe tener minimo 8 caracteres')
        .regex(/[a-zA-Z]/, 'Contrasena debe contener al menos una letra')
        .regex(/\d/, 'Contrasena debe contener al menos un numero')
        .regex(/[$&%_#]/, 'Contrasena debe contener al menos un caracter especial ($, &, %, _, #)')
        .refine(
            (password) => {
                // Verify it only contains allowed characters
                return /^[a-zA-Z0-9$&%_#]+$/.test(password);
            },
            'Contrasena solo puede contener letras, numeros y caracteres especiales ($, &, %, _, #)'
        ),
    position: z.string().min(1),
    teamId: z.string().min(1).optional(),
    teamName: z.string().min(1).optional(),
    frameId: z.string().min(1).default('bronce'),
    profileImageUrl: z.string().min(1).optional(),
});

function buildNameRegex(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}$`, 'i');
}

function extractDocId(doc) {
    if (!doc) return null;
    if (typeof doc._id === 'string' && doc._id) return doc._id;
    if (doc._id && typeof doc._id.toString === 'function') return doc._id.toString();
    return null;
}

function buildIdCandidates(id) {
    const normalized = String(id || '').trim();
    if (!normalized) return [];

    const candidates = [normalized];
    if (ObjectId.isValid(normalized)) {
        candidates.push(new ObjectId(normalized));
    }

    return candidates;
}

function buildIdFilter(id) {
    const normalized = String(id || '').trim();
    if (!normalized) return { _id: null };

    const candidates = [normalized];
    if (ObjectId.isValid(normalized)) {
        candidates.push(new ObjectId(normalized));
    }

    return candidates.length === 1 ? { _id: candidates[0] } : { _id: { $in: candidates } };
}

function normalizeImageUrl(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    if (raw.startsWith('//')) return `https:${raw}`;
    return raw;
}

// Helpers: fondo contains background images, equipos contains escudos.
async function findFondoById(teamId) {
    return db.collection('fondo').findOne(buildIdFilter(teamId));
}

async function findEquiposById(teamId) {
    return db.collection('equipos').findOne(buildIdFilter(teamId));
}

async function findFondoByName(name) {
    return db.collection('fondo').findOne({ $or: [{ name: buildNameRegex(name) }, { Name: buildNameRegex(name) }] });
}

async function findEquiposByName(name) {
    return db.collection('equipos').findOne({ $or: [{ name: buildNameRegex(name) }, { Name: buildNameRegex(name) }] });
}

async function uploadProfileImageUrl(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;

    const result = await cloudinary.uploader.upload(raw, {
        resource_type: 'image',
        folder: 'sotanitapp_profiles',
    });

    return result.secure_url || null;
}

async function resolveCardData(teamId, frameId) {
    // Prefer 'fondo' for background and 'equipos' for escudo
    const [fondoDoc, equiposDoc, frameDoc] = await Promise.all([
        teamId ? findFondoById(teamId) : Promise.resolve(null),
        teamId ? findEquiposById(teamId) : Promise.resolve(null),
        frameId ? db.collection('marco').findOne(buildIdFilter(frameId)) : Promise.resolve(null),
    ]);

    const teamDoc = fondoDoc || equiposDoc || null;
    const teamImageUrl = fondoDoc ? normalizeImageUrl(fondoDoc.imageUrl ?? fondoDoc.escudoUrl) : (equiposDoc ? normalizeImageUrl(equiposDoc.imageUrl ?? equiposDoc.escudoUrl) : null);
    const teamEscudoUrl = equiposDoc ? normalizeImageUrl(equiposDoc.escudoUrl ?? equiposDoc.imageUrl) : (fondoDoc ? normalizeImageUrl(fondoDoc.escudoUrl ?? fondoDoc.imageUrl) : null);

    return {
        teamDoc,
        frameDoc,
        teamName: teamDoc ? (teamDoc.name ?? teamDoc.Name ?? null) : null,
        teamImageUrl,
        teamEscudoUrl,
        frameImageId: frameDoc ? normalizeImageUrl(frameDoc.imageId) : null,
        resolvedTeamId: teamDoc ? extractDocId(teamDoc) : teamId,
        resolvedFrameId: frameDoc ? extractDocId(frameDoc) : frameId,
    };
}

async function handleGetNombresEquipos(req, res) {
    try {
        const rows = [];

        const fondoDocs = await db.collection('fondo').find({}, { projection: { _id: 0, name: 1, Name: 1 } }).toArray();
        const equiposDocs = await db.collection('equipos').find({}, { projection: { _id: 0, name: 1, Name: 1 } }).toArray();

        rows.push(...fondoDocs, ...equiposDocs);

        const nombres = [...new Set(
            rows
                .map((row) => String(row.name ?? row.Name ?? '').trim())
                .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

        return res.json({ nombresEquipos: nombres });
    } catch (err) {
        console.error('❌ Error en GET /api/equipos/nombres', err.message);
        return res.status(500).json({ message: 'Error obteniendo nombres de equipos' });
    }
}

app.get('/api/equipos/nombres', handleGetNombresEquipos);
app.get('/api/nombresEquipos', handleGetNombresEquipos);

async function handleGetTeamIdByName(req, res) {
    const name = String(req.query.name || '').trim();

    if (!name) {
        return res.status(400).json({ message: 'El query param name es obligatorio' });
    }

    try {
        let teamDoc = await findFondoByName(name);
        if (!teamDoc) {
            teamDoc = await findEquiposByName(name);
        }

        if (!teamDoc) {
            return res.status(404).json({ message: 'Equipo no encontrado' });
        }

        const teamId = extractDocId(teamDoc);
        if (!teamId) {
            return res.status(500).json({ message: 'El equipo no tiene id valido' });
        }

        return res.json({ name: teamDoc.name ?? teamDoc.Name, teamId });
    } catch (err) {
        console.error('❌ Error en GET /api/equipos/id', err.message);
        return res.status(500).json({ message: 'Error obteniendo teamId' });
    }
}

app.get('/api/equipos/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: 'El id del equipo es obligatorio' });
    }

    try {
        const equiposDoc = await findEquiposById(id);
        const fondoDoc = await findFondoById(id);

        const teamDoc = {
            ...(equiposDoc || {}),
            ...(fondoDoc || {}),
        };

        if (!equiposDoc && !fondoDoc) {
            return res.status(404).json({ message: 'Equipo no encontrado' });
        }

        const escudoUrl = normalizeImageUrl(
            equiposDoc?.escudoUrl ?? equiposDoc?.imageUrl ?? fondoDoc?.escudoUrl ?? fondoDoc?.imageUrl
        );
        const imageUrl = normalizeImageUrl(
            fondoDoc?.imageUrl ?? fondoDoc?.escudoUrl ?? equiposDoc?.imageUrl ?? equiposDoc?.escudoUrl
        );
        const name = teamDoc.name ?? teamDoc.Name ?? teamDoc.teamName ?? teamDoc.title ?? teamDoc.nombre ?? equiposDoc?.name ?? equiposDoc?.Name ?? fondoDoc?.name ?? fondoDoc?.Name ?? null;
        const year = teamDoc.year ?? teamDoc.founded ?? teamDoc.lastYear ?? teamDoc.foundationYear ?? teamDoc.anio ?? teamDoc.ano ?? equiposDoc?.year ?? equiposDoc?.founded ?? fondoDoc?.year ?? fondoDoc?.founded ?? null;
        const stadium = teamDoc.stadium ?? teamDoc.stadio ?? teamDoc.stadiumName ?? teamDoc.estadio ?? equiposDoc?.stadium ?? equiposDoc?.stadiumName ?? fondoDoc?.stadium ?? fondoDoc?.stadiumName ?? null;
        const lastTitle = teamDoc.lastTitle ?? teamDoc.last_title ?? teamDoc.lastTitleWon ?? teamDoc.ultimoTitulo ?? teamDoc.tituloUltimo ?? equiposDoc?.lastTitle ?? equiposDoc?.last_title ?? fondoDoc?.lastTitle ?? fondoDoc?.last_title ?? null;

        return res.json({
            ...equiposDoc,
            ...fondoDoc,
            id: extractDocId(teamDoc) || extractDocId(equiposDoc) || extractDocId(fondoDoc),
            name,
            escudoUrl,
            imageUrl,
            year,
            stadium,
            lastTitle,
        });
    } catch (err) {
        console.error('❌ Error en GET /api/equipos/:id', err.message);
        return res.status(500).json({ message: 'Error obteniendo equipo' });
    }
});

app.get('/api/equipos/id', handleGetTeamIdByName);
app.get('/api/equipo/idPorNombre', handleGetTeamIdByName);

async function handleCreateUser(req, res) {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Datos de registro invalidos', issues: parsed.error.issues });
    }

    try {
        const { username, email, password, position, frameId, teamId: inputTeamId, teamName, profileImageUrl } = parsed.data;
        const normalizedUsername = username.trim();

        const existing = await db.collection('perfiles').findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ message: 'Ya existe un usuario con ese email' });
        }

        const existingUsername = await db.collection('perfiles').findOne(
            { username: normalizedUsername },
            { collation: { locale: 'es', strength: 2 } }
        );
        if (existingUsername) {
            return res.status(409).json({ message: 'Ese nombre de usuario no esta disponible' });
        }

        let teamId = inputTeamId;
        let resolvedTeamName = teamName;

        if (teamId) {
            const teamById = await db.collection('fondo').findOne(buildIdFilter(teamId));
            if (!teamById) {
                return res.status(404).json({ message: 'teamId no existe en fondo' });
            }
            teamId = extractDocId(teamById);
            resolvedTeamName = teamById.name ?? teamById.Name;
        }

        if (!teamId && teamName) {
            const teamDoc = await db.collection('fondo').findOne({
                $or: [{ name: buildNameRegex(teamName) }, { Name: buildNameRegex(teamName) }],
            });
            if (!teamDoc) {
                return res.status(404).json({ message: 'Equipo no encontrado para el registro' });
            }
            teamId = extractDocId(teamDoc);
            resolvedTeamName = teamDoc.name ?? teamDoc.Name;
        }

        if (!teamId) {
            return res.status(400).json({ message: 'Debe enviarse teamId o teamName valido' });
        }

        const frameDoc = await db.collection('marco').findOne(buildIdFilter(frameId));
        if (!frameDoc) {
            return res.status(404).json({ message: 'frameId no existe en marco' });
        }

        const resolvedFrameId = extractDocId(frameDoc);

        const hashedPassword = await bcrypt.hash(password, 10);
        const resolvedProfileImageUrl = profileImageUrl
            ? await uploadProfileImageUrl(profileImageUrl)
            : null;

        const userDoc = {
            username: normalizedUsername,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            position: position.trim(),
            teamId,
            frameId: resolvedFrameId,
            profileImageUrl: resolvedProfileImageUrl,
            createdAt: new Date(),
        };

        const result = await db.collection('perfiles').insertOne(userDoc);
        const persistedUser = await db.collection('perfiles').findOne({ _id: result.insertedId });

        if (!persistedUser) {
            return res.status(500).json({ message: 'No se pudo confirmar la creacion del usuario en base de datos' });
        }

        const cardData = await resolveCardData(persistedUser.teamId, persistedUser.frameId);

        return res.status(201).json({
            id: persistedUser._id.toString(),
            username: persistedUser.username,
            email: persistedUser.email,
            position: persistedUser.position,
            profileImageUrl: persistedUser.profileImageUrl ?? null,
            teamId: cardData.resolvedTeamId,
            teamName: cardData.teamName ?? resolvedTeamName,
            teamImageUrl: cardData.teamImageUrl,
            frameId: cardData.resolvedFrameId,
            frameImageId: cardData.frameImageId,
            frameImageUrl: cardData.frameImageId,
        });
    } catch (err) {
        if (err?.code === 11000 && (String(err?.message || '').includes('username') || err?.keyPattern?.username)) {
            return res.status(409).json({ message: 'Ese nombre de usuario no esta disponible' });
        }
        console.error('❌ Error en POST /api/usuarios', err.message);
        return res.status(500).json({ message: 'Error creando usuario' });
    }
}

app.post('/api/usuarios', handleCreateUser);
app.post('/api/crearNuevoUsuario', handleCreateUser);

// Check username availability
app.get('/api/usuarios/usernameDisponible', async (req, res) => {
    try {
        const username = String(req.query.username || '').trim();
        if (!username) return res.status(400).json({ message: 'username es obligatorio' });

        if (username.length < 3 || username.length > 10) {
            return res.json({ available: false, reason: 'length' });
        }

        if (!/^[a-zA-Z0-9.\-]+$/.test(username)) {
            return res.json({ available: false, reason: 'invalid_chars' });
        }

        if (!/[a-zA-Z]/.test(username)) {
            return res.json({ available: false, reason: 'needs_letter' });
        }

        const existing = await db.collection('perfiles').findOne({ username }, { collation: { locale: 'es', strength: 2 } });
        return res.json({ available: !Boolean(existing) });
    } catch (err) {
        console.error('Error checking username availability', err.message);
        return res.status(500).json({ message: 'Error interno' });
    }
});

async function handleUpdateUser(req, res) {
    const { id } = req.params;
    const { username, teamId, teamName, position, profileImageUrl } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'El id del usuario es obligatorio' });
    }

    try {
        const updateData = {};

        if (username) {
            const normalizedUsername = String(username).trim();

            if (normalizedUsername.length < 3) {
                return res.status(400).json({ message: 'El nombre de usuario debe tener al menos 3 caracteres' });
            }

            if (normalizedUsername.length > 10) {
                return res.status(400).json({ message: 'El nombre de usuario no puede superar 10 caracteres' });
            }

            if (!/^[a-zA-Z0-9.\-]+$/.test(normalizedUsername)) {
                return res.status(400).json({ message: 'Username solo puede contener letras, numeros, "." y "-"' });
            }

            if (!/[a-zA-Z]/.test(normalizedUsername)) {
                return res.status(400).json({ message: 'El username debe contener al menos una letra' });
            }

            const idCandidates = buildIdCandidates(id);
            const existingUsername = await db.collection('perfiles').findOne(
                {
                    username: normalizedUsername,
                    _id: { $nin: idCandidates },
                },
                { collation: { locale: 'es', strength: 2 } }
            );

            if (existingUsername) {
                return res.status(409).json({ message: 'Ese nombre de usuario no esta disponible' });
            }

            updateData.username = normalizedUsername;
        }

        if (teamName) {
            const teamDoc = await db.collection('fondo').findOne({
                $or: [{ name: buildNameRegex(teamName) }, { Name: buildNameRegex(teamName) }],
            });

            if (!teamDoc) {
                return res.status(404).json({ message: 'Equipo no encontrado' });
            }

            updateData.teamId = extractDocId(teamDoc);
        } else if (teamId) {
            const teamDoc = await db.collection('fondo').findOne(buildIdFilter(teamId));
            if (!teamDoc) {
                return res.status(404).json({ message: 'Equipo no encontrado' });
            }
            updateData.teamId = extractDocId(teamDoc);
        }

        if (position) {
            updateData.position = position.trim();
        }

        if (profileImageUrl) {
            updateData.profileImageUrl = await uploadProfileImageUrl(profileImageUrl);
        }

        if (!Object.keys(updateData).length) {
            return res.status(400).json({ message: 'No hay campos para actualizar' });
        }

        const result = await db.collection('perfiles').findOneAndUpdate(
            buildIdFilter(id),
            { $set: updateData },
            { returnDocument: 'after' }
        );

        const updatedUser = result?.value ?? result;

        if (!updatedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const cardData = await resolveCardData(updatedUser.teamId, updatedUser.frameId);

        return res.json({
            id: extractDocId(updatedUser),
            username: updatedUser.username,
            email: updatedUser.email,
            position: updatedUser.position,
            profileImageUrl: updatedUser.profileImageUrl ?? null,
            teamId: cardData.resolvedTeamId,
            teamName: cardData.teamName,
            teamImageUrl: cardData.teamImageUrl,
            frameId: cardData.resolvedFrameId,
            frameImageId: cardData.frameImageId,
            frameImageUrl: cardData.frameImageId,
        });
    } catch (err) {
        if (err?.code === 11000 && (String(err?.message || '').includes('username') || err?.keyPattern?.username)) {
            return res.status(409).json({ message: 'Ese nombre de usuario no esta disponible' });
        }
        console.error('❌ Error en PUT /api/usuarios/:id', err.message);
        return res.status(500).json({ message: 'Error actualizando usuario' });
    }
}

app.put('/api/usuarios/:id', handleUpdateUser);

async function handleLogin(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
    }

    try {
        const user = await db.collection('perfiles').findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(401).json({ message: 'Credenciales invalidas' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Credenciales invalidas' });
        }

        const cardData = await resolveCardData(user.teamId, user.frameId);

        return res.json({
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            position: user.position,
            profileImageUrl: user.profileImageUrl ?? null,
            teamId: cardData.resolvedTeamId,
            teamName: cardData.teamName ?? 'Sin equipo',
            teamImageUrl: cardData.teamImageUrl,
            frameId: cardData.resolvedFrameId,
            frameImageId: cardData.frameImageId,
            frameImageUrl: cardData.frameImageId,
        });
    } catch (err) {
        console.error('❌ Error en POST /api/login', err.message);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
}

app.post('/api/login', handleLogin);

async function startServer() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        db = client.db(DB_NAME);

        try {
            await db.collection('perfiles').createIndex(
                { username: 1 },
                {
                    unique: true,
                    collation: { locale: 'es', strength: 2 },
                    partialFilterExpression: { username: { $type: 'string' } },
                }
            );
        } catch (indexErr) {
            console.error('⚠️ No se pudo crear indice unico para username:', indexErr.message);
        }

        console.log("🔥 Conectado a MongoDB Atlas");
        app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
    } catch (err) {
        console.error("❌ Error de conexión a MongoDB", err.message);
        process.exit(1);
    }
}

startServer();