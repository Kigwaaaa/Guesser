import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRoomActionRateLimit } from "../../../../lib/roomRateLimit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const clientIp = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
  return `ip:${clientIp}`;
}

function generateCode(length = 4) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }

  return value;
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Room creation is not configured." }, { status: 500 });
  }

  const clientId = getClientIdentifier(request);
  const rateLimit = checkRoomActionRateLimit("create-room", Date.now(), undefined, clientId);
  if (!rateLimit.allowed) {
    const seconds = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000));
    return NextResponse.json(
      { error: `Too many room creation attempts. Please wait ${seconds} seconds and try again.` },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const theme = typeof body?.theme === "string" ? body.theme : "";
    const count = Number(body?.count ?? 3);

    if (!name || !theme || !Number.isFinite(count) || count <= 0) {
      return NextResponse.json({ error: "Please provide a valid name, theme, and player count." }, { status: 400 });
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let code = generateCode(4);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { error: roomErr } = await client.from("rooms").insert({
        code,
        theme,
        target_player_count: count,
        status: "waiting",
      });

      if (!roomErr) {
        break;
      }

      if (attempt === 4) {
        return NextResponse.json({ error: "Failed to create a unique room code. Please try again." }, { status: 500 });
      }

      code = generateCode(4);
    }

    const { data: playerData, error: playerErr } = await client
      .from("players")
      .insert({ room_code: code, name, turn_order_index: 0 })
      .select()
      .maybeSingle();

    if (playerErr || !playerData) {
      return NextResponse.json({ error: "Failed to add host to the room." }, { status: 500 });
    }

    return NextResponse.json({ code, playerId: playerData.id }, { status: 201 });
  } catch (error) {
    console.error("room-create failed", error);
    return NextResponse.json({ error: "Failed to create room." }, { status: 500 });
  }
}
