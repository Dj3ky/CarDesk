import { auth } from "@/lib/auth";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const protectedPaths = ["/dashboard", "/customers", "/products", "/pricelist", "/offers", "/settings", "/profile"];
const authPaths = ["/login"];

function isProtectedPath(pathname: string): boolean {
  const stripped = pathname.replace(/^\/(en|sl)/, "");
  return protectedPaths.some((p) => stripped === p || stripped.startsWith(`${p}/`));
}

function isAuthPath(pathname: string): boolean {
  const stripped = pathname.replace(/^\/(en|sl)/, "");
  return authPaths.some((p) => stripped === p || stripped.startsWith(`${p}/`));
}

export default auth(async function proxy(req: NextRequest & { auth?: unknown }) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const session = (req as { auth?: { user?: { id?: string } } }).auth;
  const isLoggedIn = !!session?.user;

  if (isProtectedPath(pathname) && !isLoggedIn) {
    const locale = pathname.match(/^\/(en|sl)/)?.[1] ?? routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath(pathname) && isLoggedIn) {
    const locale = pathname.match(/^\/(en|sl)/)?.[1] ?? routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
