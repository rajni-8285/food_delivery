export default function home() {
    return (
        <main className="flex item-center min-h-screen bg-gray-100">
            <div className="w-full bg-white p-8 rounded-[3px] shadow-md">
                <h1 className="text-[20px] font-bold text-center mb-6">
                    Signin
                </h1>
                <form className="space-y-4 text-center">
                    <div>
                        <label className="block mb-2 font-medium">
                            Email Address
                        </label>
                        <input
                            type="email"
                            placeholder="Enter your Email"
                            className="w-full  max-w-md rounded-md border border-gray-300 px-2 py-2" />

                    </div>
                    <div>
                        <label className="block mb-2 font-medium">
                            Password
                        </label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            className="w-full  max-w-md border border-gray-300 rounded-md px-4 py-2" />

                    </div>
                    <button
                        type="submit"
                        className="w-full max-w-md bg-orange-500 text-white py-2 rounded-md font-medium">
                        SignIn
                    </button>
                </form>
            </div>
        </main>

    );

}