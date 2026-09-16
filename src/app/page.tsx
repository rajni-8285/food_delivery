import Link from "next/link";

export default function Home() {
  return (
    <main>
      <nav>
        <div className="bg-[#000000] h-10 w-full text-white space-x-10 flex items-center justify-between">
          <Link href="/">PizzaHub</Link>


          <div className="flex justify-end text-white space-x-10">
            <Link href="/contact">Contact</Link>
            <Link href="/signin">Sign In</Link>
            <Link href="/signup">SignUp</Link>
          </div>
        </div>
      </nav>
    </main>
  );
}