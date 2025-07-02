import { Router } from 'express';
import userApi from './user.js';
import requestApi from './requests.js';

let router = Router();
router.use('/users', userApi);
router.use('/requests', requestApi);
export default router;