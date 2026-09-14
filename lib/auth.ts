import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

const SESSION_COOKIE_NAME = "talentbench_session";

// In production use a secret from env, with a secure fallback for development
const AUTH_SECRET = process.env.AUTH_SECRET || "talentbench-ultra-secure-awwwards-key-2026";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  // Store userId in an HTTP-only secure cookie
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie?.value) {
      // For convenience in testing/demo, if no user exists, look for a default demo HR user or return null
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionCookie.value },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
      },
    });

    return user;
  } catch (err) {
    console.error("Error getting session user:", err);
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Seed or retrieve a demo HR user if needed
export async function getOrCreateDemoUser() {
  let demoUser = await prisma.user.findFirst({
    where: { email: "hr@talentbench.io" },
  });

  if (!demoUser) {
    const hashedPassword = await hashPassword("TalentBench2026!");
    demoUser = await prisma.user.create({
      data: {
        name: "Alexandra Sterling",
        email: "hr@talentbench.io",
        password: hashedPassword,
        company: "Vanguard Systems",
      },
    });

    // Also seed a sample job profile with complete connector pipeline and candidates
    const job = await prisma.jobProfile.create({
      data: {
        title: "Staff Distributed Systems Engineer",
        description:
          "We are seeking a seasoned engineer to lead our low-latency data streaming cluster. You will architect fault-tolerant consensus engines, optimize gRPC microservices, and manage multi-region Kubernetes deployments.",
        minExperience: 5,
        maxExperience: 9,
        userId: demoUser.id,
        pipeline: {
          create: [
            {
              type: "RESUME_SCREENING",
              title: "Autonomous AI Resume Screening",
              description: "Screen for 5-9 years experience, distributed systems, and Go/Rust expertise.",
              order: 0,
              config: JSON.stringify({ passThreshold: 75, autoShortlist: true }),
            },
            {
              type: "APTITUDE",
              title: "Cognitive Aptitude & Logic",
              description: "Timed logic evaluation focusing on concurrency reasoning.",
              order: 1,
              config: JSON.stringify({ passingScore: 80 }),
            },
            {
              type: "DSA",
              title: "Distributed Algorithms & DSA Challenge",
              description: "Live system coding session implementing Raft or Paxos leader election.",
              order: 2,
              config: JSON.stringify({ difficulty: "Hard" }),
            },
            {
              type: "COMMUNICATION",
              title: "Technical Communication & Architecture Review",
              description: "Presenting system trade-offs to senior staff.",
              order: 3,
            },
            {
              type: "HR_ROUND",
              title: "Executive HR & Culture Alignment",
              description: "Values, leadership ethos, and compensation alignment.",
              order: 4,
            },
          ],
        },
        candidates: {
          create: [
            {
              name: "Elena Rostova",
              email: "elena.rostova@engineer.dev",
              phone: "+1 (555) 349-2810",
              experienceYears: 7,
              skills: "Rust, Go, Raft, Kubernetes, Distributed Storage, RocksDB",
              resumeText:
                "Staff Distributed Systems Engineer with 7 years of production experience building high-throughput event processing pipelines at CloudScale. Architected Raft consensus layer handling 800k events/sec. Expert in Rust and Go concurrency patterns.",
              status: "SHORTLISTED",
              currentRound: 2,
              personalizedReply:
                "Hi Elena, your 7 years of deep distributed consensus architecture and proven Raft implementation at CloudScale strongly align with our infrastructure mission. We are thrilled to invite you directly to our DSA round.",
            },
            {
              name: "David Kim",
              email: "david.kim@techflow.io",
              phone: "+1 (555) 782-9011",
              experienceYears: 3,
              skills: "TypeScript, React, Node.js, Next.js, Tailwind",
              resumeText:
                "Frontend Specialist with 3 years building responsive web apps with React, Tailwind, and Node.js. Passionate about micro-interactions and design engineering.",
              status: "REJECTED",
              currentRound: 0,
              personalizedReply:
                "Hi David, thank you for applying to TalentBench. While your UI design and frontend engineering craft are impressive, this role requires 5+ years of specialized distributed systems internals. We will keep your information for future frontend openings.",
            },
            {
              name: "Kavita Sharma",
              email: "kavita.sharma@datacore.org",
              phone: "+1 (555) 432-1988",
              experienceYears: 6,
              skills: "C++, Go, Distributed Databases, eBPF, Linux Internals",
              resumeText:
                "Systems Engineer with 6 years experience optimizing Linux kernel bypass networking and database storage engines. Implemented custom zero-copy gRPC RPC framework in Go and C++.",
              status: "PENDING",
              currentRound: 0,
            },
          ],
        },
      },
    });
  }

  return demoUser;
}

