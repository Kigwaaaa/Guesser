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

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Room join is not configured." }, { status: 500 });
  }

  const clientId = getClientIdentifier(request);
  const rateLimit = checkRoomActionRateLimit("join-room", Date.now(), undefined, clientId);
  if (!rateLimit.allowed) {
    const seconds = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000));
    return NextResponse.json(
      { error: `Too many join attempts. Please wait ${seconds} seconds and try again.` },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!code || !name) {
      return NextResponse.json({ error: "Please provide a valid room code and name." }, { status: 400 });
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: room, error: roomErr } = await client
      .from("rooms")
      .select("code,target_player_count,status")
      .eq("code", code)
      .maybeSingle();

    if (roomErr) {
      return NextResponse.json({ error: "Failed to check room." }, { status: 500 });
    }
    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    if (room.status !== "waiting") {
      return NextResponse.json({ error: "This room cannot be joined." }, { status: 409 });
    }

    const { count, error: countErr } = await client
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("room_code", code);

    if (countErr) {
      return NextResponse.json({ error: "Failed to count players." }, { status: 500 });
    }

    const currentPlayers = count ?? 0;
    if (currentPlayers >= room.target_player_count) {
      return NextResponse.json({ error: "This room is already full." }, { status: 409 });
    }

    const { data: playerData, error: insertErr } = await client
      .from("players")
      .insert({ room_code: code, name, turn_order_index: currentPlayers })
      .select()
      .maybeSingle();

    if (insertErr || !playerData) {
      return NextResponse.json({ error: "Failed to join room." }, { status: 500 });
    }

    return NextResponse.json({ code, playerId: playerData.id }, { status: 200 });
  } catch (error) {
    console.error("room-join failed", error);
    return NextResponse.json({ error: "Failed to join room." }, { status: 500 });
  }
}
