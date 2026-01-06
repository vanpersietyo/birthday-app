import { Router } from 'express';
import { UserController } from '../controllers/UserController';

const router = Router();
const userController = new UserController();

router.post('/user', userController.createUser);

router.get('/user/:id', userController.getUser);

router.get('/users', userController.getAllUsers);

router.put('/user/:id', userController.updateUser);

router.delete('/user/:id', userController.deleteUser);

export default router;
