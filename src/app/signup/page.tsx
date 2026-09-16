"use client";

import { useState } from "react";

export default function SignUp() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // ✅ NEW — paste this in
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                alert("Account created successfully!");
                console.log("Registered user:", data);
            } else {
                alert(data.message || "Registration failed");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Could not connect to server");
        }
    };


    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="w-full max-w-md bg-white p-8 rounded-md shadow-md">

                <h1 className="text-2xl font-bold text-center mb-6">
                    Create Account
                </h1>

                <form onSubmit={handleSubmit} className="space-y-4">

                    <div>
                        <label className="block mb-2 font-medium">
                            Name
                        </label>

                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full border border-gray-300 rounded-md px-4 py-2"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">
                            Email Address
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="w-full border border-gray-300 rounded-md px-4 py-2"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">
                            Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a password"
                            className="w-full border border-gray-300 rounded-md px-4 py-2"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">
                            Confirm Password
                        </label>

                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            className="w-full border border-gray-300 rounded-md px-4 py-2"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-orange-500 text-white py-2 rounded-md font-medium"
                    >
                        Create Account
                    </button>

                </form>
            </div>
        </main>
    );
}