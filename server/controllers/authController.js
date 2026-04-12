import bcrypt, { hash } from "bcryptjs";
import jwt from "jsonwebtoken"

import userModel from "../models/userModel.js";
import transporter from "../config/nodemailer.js";
import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from "../config/emailTemplates.js";

export const register = async (req, res) => {

    const { name, password, email } = req.body

    if (!name || !email || !password) {
        return res.json({ success: false, message: " Missing credentials" })
    }

    try {
        const existingUser = await userModel.findOne({ email })
        if (existingUser) {
            return res.json({ success: false, message: "User already exists" })
        }


        const hasedPassword = await bcrypt.hash(password, 10);

        const user = new userModel({
            name,
            email,
            password: hasedPassword,
        })

        await user.save();


        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" })

        res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? 'none' : "strict", maxAge: 7 * 24 * 60 * 60 * 1000 })


        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Welcome to Authentication',
            text: `Welcome to authentication account created with email id ${email}`
        }

        await transporter.sendMail(mailOptions)


        return res.json({ success: true })


    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}


export const login = async (req, res) => {

    const { email, password } = req.body

    if (!email || !password) {
        return res.json({ success: false, message: " Missing credentials " })

    }


    try {

        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: " Invalid credentials " })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.json({ success: false, message: "Invalid credentials" })
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" })

        res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? 'none' : "strict", maxAge: 7 * 24 * 60 * 60 * 1000 })

        return res.json({ success: true })
    }
    catch (error) {
        console.log(error)

        return res.json({ success: false, message: error.message })
    }

}


export const logOut = async (req, res) => {


    try {
        res.clearCookie("token", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? 'none' : "strict", maxAge: 7 * 24 * 60 * 60 * 1000 })

        return res.json({ success: true, message: "Logged out successfully " })

    } catch (error) {
        return res.json({ sucess: false, message: error.message })
    }
}


// export const sendVerifyOtp = async (req, res) => {
//     try {

//         const userId = req.userId;

//         const user = await userModel.findById(userId);

//         if (user.isAccountVerified) {

//             return res.json({ success: false, message: " account already verified" })
//         }


//         const otp = String(Math.floor(100000 + Math.random() * 900000))


//         user.verifyOtp = otp;

//         user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;


//         await user.save()


//         const mailOptions = {
//             from: process.env.SENDER_EMAIL,
//             to: user.email,
//             subject: 'Account verification otp',
//             text: `your otp is  ${otp} . verify your account using this OTP`
//         }



//         await transporter.sendMail(mailOptions)

//         res.json({ success: true, message: "verification otp sent on Email" })
//     } catch (error) {
//         console.log(error)
//         res.json({ success: false, message: error.message })
//     }
// }


export const sendVerifyOtp = async (req, res) => {
    try {
        const userId = req.userId; // ✅ FIXED (secure)

        console.log("USER ID:", userId);

        const user = await userModel.findById(userId);

        // ✅ MUST CHECK
        if (!user) {
            return res.json({
                success: false,
                message: "User not found",
            });
        }

        if (user.isAccountVerified) {
            return res.json({
                success: false,
                message: "Account already verified",
            });
        }

        const otp = String(
            Math.floor(100000 + Math.random() * 900000)
        );

        user.verifyOtp = otp;
        user.verifyOtpExpireAt =
            Date.now() + 24 * 60 * 60 * 1000;

        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: "Account verification OTP",
            // text: `Your OTP is ${otp}`,
            html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.email)
        };

        await transporter.sendMail(mailOptions);

        return res.json({
            success: true,
            message: "Verification OTP sent",
        });

    } catch (error) {
        console.log(error);
        return res.json({
            success: false,
            message: error.message,
        });
    }
};


// export const verifyEmail = async (req, res) => {

//     const { userId, otp } = req.body;

//     if (!userId || !otp) {
//         return res.json({ success: false, message: "Missing Details" })
//     }


//     try {
//         const user = await userModel.findById(userId);


//         if (!user) {
//             return res.json({ success: false, message: "User not found" })
//         }
//         if (user.verifyOtp === " " || user.verifyOtp != otp) {
//             return res.json({ success: false, message: " Invalid otp" })
//         }

//         if (user.verifyOtpExpireAt < Date.now()) {
//             return res.json({ success: false, message: "Otp Expired" })

//         }


//         user.isAccountVerified = true;
//         user.verifyOtp = ''

//         user.verifyOtpExpireAt = 0;
//         await user.save()

//         return res.json({ success: true, message: 'Email Verified' })


//     } catch (error) {
//         console.log(error)
//         res.json({ success: false, message: error.message })
//     }


// }

export const verifyEmail = async (req, res) => {
    const { otp } = req.body;
    const userId = req.userId; // ✅ FIXED (from middleware)

    if (!otp) {
        return res.status(400).json({
            success: false,
            message: "Missing OTP",
        });
    }

    try {
        const user = await userModel.findById(userId);

        // ✅ Check user exists
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // ✅ Correct OTP validation
        if (!user.verifyOtp || user.verifyOtp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // ✅ Expiry check
        if (user.verifyOtpExpireAt < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "OTP expired",
            });
        }

        // ✅ Update user
        user.isAccountVerified = true;
        user.verifyOtp = "";
        user.verifyOtpExpireAt = 0;

        await user.save();

        return res.json({
            success: true,
            message: "Email verified successfully",
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


export const isAuthenticated = async (req, res) => {
    try {


        return res.json({ success: true })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })

    }
}



export const sendResetOtp = async (req, res) => {
    const { email } = req.body

    if (!email) {
        return res.json({ success: false, message: "Email is required" })

    }

    try {

        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: " User not found" })

        }


        const otp = String(
            Math.floor(100000 + Math.random() * 900000)
        );

        user.resetOtp = otp;
        user.resetOtpExpireAt =
            Date.now() + 15 * 60 * 1000;

        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: "Password reset otp",
            // text: `Your OTP for resetting the password is ${otp} . use this to proceed with resetting your password `,
            html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.email)
        };

        await transporter.sendMail(mailOptions);



        return res.json({ success: true, message: "Otp sent to your email" })

    } catch (error) {

        console.log(error)
        res.json({ success: false, message: error.message })
    }

}



export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body

    if (!email || !otp || !newPassword) {
        return res.json({ success: false, message: " Email ,otp and new password is required" })

    }

    try {

        const user = await userModel.findOne({ email })

        if (!email) {
            return res.json({ success: false, message: " user not found" })

        }

        if (user.resetOtp === "" || user.resetOtp !== otp) {
            return res.json({ success: false, message: "Invalid otp" })

        }

        if (user.resetOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: "Otp expired" })


        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        user.password = hashedPassword

        user.resetOtp = "";
        user.resetOtpExpireAt = 0;

        await user.save();

        res.json({ success: true, message: "Password reset successfully " })

    }
    catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}