"use client";

import { useEffect, useState } from "react";

type User = {
    id: string;
    name: string;
    email: string;
};

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
            const parsedUser: User = JSON.parse(storedUser);
            setUser(parsedUser);
        }
    }, []);

    if (!user) {
        return (
            <main className="flex items-center justify-center min-h-screen bg-gray-100">
                <p className="text-gray-600">
                    Loading...
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-100 p-8">

            <div className="max-w-4xl mx-auto bg-white p-8 rounded-md shadow-md">

                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                    Welcome back, {user.name}!
                </h1>

                <p className="text-gray-600">
                    You are successfully logged in to PizzaHub.
                </p>

            </div>

        </main>
    );
}
