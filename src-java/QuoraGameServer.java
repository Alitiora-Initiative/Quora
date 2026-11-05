import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

public class QuoraGameServer extends WebSocketServer {
    private static final int SERVER_PORT = 8080;
    // Thread-safe map tracking active connected player positions
    private final ConcurrentHashMap<String, String> playerTransformRegistry = new ConcurrentHashMap<>();

    public QuoraGameServer() {
        super(new InetSocketAddress(SERVER_PORT));
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        String uniqueClientId = conn.getRemoteSocketAddress().toString();
        System.out.println("[QUORA SERVER] New client connection verified: " + uniqueClientId);
        
        // Transmit an identification packet down to the newly validated client node
        conn.send("{\"type\":\"INIT\",\"id\":\"" + uniqueClientId + "\"}");
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        String uniqueClientId = conn.getRemoteSocketAddress().toString();
        playerTransformRegistry.remove(uniqueClientId);
        System.out.println("[QUORA SERVER] Player disconnected: " + uniqueClientId);
        
        broadcastMessage("{\"type\":\"PEER_DISCONNECT\",\"id\":\"" + uniqueClientId + "\"}");
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        String uniqueClientId = conn.getRemoteSocketAddress().toString();
        
        // Intercept fast movement data arrays and cache them inside the registry map
        if (message.contains("\"type\":\"MOVE\"")) {
            playerTransformRegistry.put(uniqueClientId, message);
        }
        
        triggerGlobalWorldSync();
    }

    private void triggerGlobalWorldSync() {
        // Compile all player position string maps into a single JSON network broadcast package
        StringBuilder jsonBuilder = new StringBuilder("{\"type\":\"UPDATE_WORLD\",\"players\":{}");
        playerTransformRegistry.forEach((id, transform) -> {
            jsonBuilder.append(",\"").append(id).append("\":").append(transform);
        });
        jsonBuilder.append("}");
        
        broadcastMessage(jsonBuilder.toString().replace("{},", "{"));
    }

    private void broadcastMessage(String textPayload) {
        for (WebSocket client : getConnections()) {
            if (client.isOpen()) {
                client.send(textPayload);
            }
        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        System.err.println("[QUORA SERVER CRITICAL ERROR] Pipeline exception: " + ex.getMessage());
    }

    @Override
    public void onStart() {
        System.out.println("[QUORA SERVER RUNNING] Multi-threaded room cluster active on port: " + SERVER_PORT);
    }

    public static void main(String[] args) {
        QuoraGameServer serverInstance = new QuoraGameServer();
        serverInstance.start();
    }
}