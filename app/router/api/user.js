import { Router } from "express";
import { userServices } from "../../services/index.js";
import { roles, status } from "../../constants/index.js";
import { checkLoginStatus } from "../../middleware/checkAuth.js";
import { checkAdmin } from "../../middleware/checkAdmin.js";
import { UserCreationSchema, UserUpdateSchema } from "../../schema/user.js";
import { bcryptPass, generatePassword } from "../../libs/encryption.js";
import { sendNewUserEmail } from "../../libs/communication.js";

const router = Router();

router.get("/listUsers", checkLoginStatus, checkAdmin, async (req, res, next) => {
  try {
    const users = await userServices
      .find(
        {
          status: status.active,
          role: roles.user,
        },
        {
          id: 1,
          name: 1,
          email: 1,
          role: 1,
        },
        {}
      )
      
    return res.json(users);
  } catch (error) {
    next(error);
  }
});


router.post(
  "/newUser",
  checkLoginStatus,
  checkAdmin,
  async (req, res, next) => {
    try {
      const body = await UserCreationSchema.safeParseAsync(req.body);
      if (!body.success) {
        return res.status(400).json({
          error: "Payload is not valid",
          detail: body.error,
        });
      }
      const userObj = body.data;
      userObj.createdBy = req.session.userId;
      userObj.updatedBy = req.session.userId;
      userObj.role = roles.user;
      userObj.status = status.active;
      const password = generatePassword(10);
      sendNewUserEmail(userObj.email, password);
      userObj.password = await bcryptPass(password);
      const user = await userServices.save(userObj);
      return res.json({ id: user.id, email: user.email, name: user.name });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/updateUser/:userId",
  checkLoginStatus,
  checkAdmin,
  async (req, res, next) => {
    try {
      console.log("updateUser");
      const {  userId } = req.params;
      const body = await UserUpdateSchema.safeParseAsync(req.body);
      if (body.error) {
        console.log("update user error : ", body.error);
        return res.status(400).json({
          error: `Payload is not valid`,
          detail: body.error,
        });
      }
      const userObj = await userServices.findOne(
        { id: userId, status: status.active },
        {},
        {}
      );
      if (!userObj) {
        return res.status(404).json({
          error: "User not found",
        });
      }
      const updatedObj = await userServices.updateOne(
        {
          id: userId,
        },
        { $set: body.data },
        {}
      );
      return res.json({
        id: userObj.id,
        name: updatedObj.name,
        email: updatedObj.email,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:userId",
  checkLoginStatus,
  checkAdmin,
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const userObj = await userServices.findOne(
        {
          id: userId,
        },
        {},
        {}
      );
      if (!userObj) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      await userServices.updateOne(
        {
          id: userId,
        },
        {
          $set: {
            email: `${userObj.email}-Deleted-${Date.now()}`,
            deletedBy: req.session.userId,
            status: status.deleted,
          },
        },
        {}
      );
      return res.json({
        id: userObj.id,
      });
    } catch (error) {
      next(error);
    }
  }
);



export default router;
