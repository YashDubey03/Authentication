import jwt from "jsonwebtoken";

const userAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token;



        if (!token) {
            return res.json({
                success: false,
                message: "Not authorized, login again",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);



        if (!decoded.userId) {
            return res.json({
                success: false,
                message: "Invalid token",
            });
        }

        // ✅ FIXED
        req.userId = decoded.userId;

        next();
    } catch (error) {


        return res.json({
            success: false,
            message: "Token invalid or expired",
        });
    }
};

export default userAuth;