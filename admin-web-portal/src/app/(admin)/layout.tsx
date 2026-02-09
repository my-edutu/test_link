import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
                <Header />
                <main className="p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
