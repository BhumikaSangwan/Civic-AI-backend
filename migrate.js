import './app/config/env.js';
import mongoose from './app/config/mongoose.js';
import { roles } from './app/constants/index.js';
import { bcryptPass } from './app/libs/encryption.js';
import userSchema from './app/models/admin.js';


async function genAdmin(email, password, name) {
    const passwordHash = await bcryptPass(password);
    const user = await new userSchema({
        name,
        password: passwordHash,
        role: roles.admin,
        email: email,
        createdBy: null,
        updatedBy: null,
    }).save();
    console.log(`New Admin Created with id ${user.id.toString()}`);
    process.exit(0);
}

genAdmin('test@gmail.com', 'test', 'test');