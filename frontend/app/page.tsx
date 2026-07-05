import { redirect } from "next/navigation";

export default function Home() {
  // Kullanıcı ana sayfaya (localhost:3000) girdiğinde
  // onu anında bizim yeni akıllı panele yönlendiriyoruz.
  redirect("/dashboard");
}
