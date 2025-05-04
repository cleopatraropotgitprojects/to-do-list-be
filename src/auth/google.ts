import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: "/auth/google/callback",
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0].value;
                if (!email) return done(null, false);

                let user = await prisma.user.findUnique({ where: { email } });

                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            email,
                            name: profile.displayName,
                            password: "",
                            isVerified: true,
                            verificationCode: "",
                        },
                    });
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    )
);
