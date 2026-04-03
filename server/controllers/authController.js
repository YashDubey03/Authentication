import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"

import userModel from "../models/userModel.js";

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