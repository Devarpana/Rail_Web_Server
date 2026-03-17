import express from 'express';
import userAuth from '../middleware/UserAuth.js';
import { getUserData } from '../controller/UserController.js';

const UserRouter = express.Router();

UserRouter.get('/data', userAuth, getUserData);

export default UserRouter;