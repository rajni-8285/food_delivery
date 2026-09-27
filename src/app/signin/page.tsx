"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function SignIn() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setError("");

        // Frontend validation
        if (!email || !password) {
            setError("Email and password are required");
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                "http://localhost:5000/api/auth/login",
                {
                    email,
                    password,
                }
            );

            console.log("Login response:", response.data);

            localStorage.setItem(
                "user",
                JSON.stringify(response.data.user)
            );


            alert("Login successful!");
            router.push("/dashboard");

        } catch (error) {
            console.error("Login error:", error);

            if (axios.isAxiosError(error)) {
                setError(
                    error.response?.data?.message ||
                    "Login failed"
                );
            } else {
                setError("Something went wrong");
            }

        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex items-center min-h-screen bg-gray-100">

            <div className="w-full max-w-md mx-auto bg-white p-8 rounded-[3px] shadow-md">

                <h1 className="text-[20px] font-bold text-center mb-6">
                    Signin
                </h1>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 text-center"
                >

                    {/* EMAIL */}

                    <div>
                        <label className="block mb-2 font-medium">
                            Email Address
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your Email"
                            className="w-full max-w-md rounded-md border border-gray-300 px-2 py-2"
                        />
                    </div>


                    {/* PASSWORD */}

                    <div>
                        <label className="block mb-2 font-medium">
                            Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full max-w-md border border-gray-300 rounded-md px-4 py-2"
                        />
                    </div>


                    {/* ERROR */}

                    {error && (
                        <p className="text-red-500 text-sm">
                            {error}
                        </p>
                    )}


                    {/* BUTTON */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full max-w-md bg-orange-500 text-white py-2 rounded-md font-medium disabled:opacity-50"
                    >
                        {loading ? "Signing in..." : "SignIn"}
                    </button>

                </form>
            </div>

        </main>
    );
}

