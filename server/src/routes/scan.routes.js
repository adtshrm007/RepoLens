import express from 'express';
import { startScan, getScanStatus, getScanFullPayload, getScanFiles } from '../controllers/scan.controller.js';
import { verifyToken } from '../middleware/verifyJWT.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', startScan);
router.get('/:id/status', getScanStatus);
router.get('/:id/files', getScanFiles);
router.get('/:id', getScanFullPayload);

export default router;
