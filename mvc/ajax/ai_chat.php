<?php
session_start();
header('Content-Type: application/json');

// Autoloader
spl_autoload_register(function ($class) {
    $prefixes = [
        'System\\' => __DIR__ . '/../../system/',
        'App\\' => __DIR__ . '/../../app/',
    ];
    
    foreach ($prefixes as $prefix => $base_dir) {
        $len = strlen($prefix);
        if (strncmp($prefix, $class, $len) !== 0) {
            continue;
        }
        
        $relative_class = substr($class, $len);
        $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
        
        if (file_exists($file)) {
            require $file;
        }
    }
});

require_once __DIR__ . '/../../system/Config.php';
require_once __DIR__ . '/../../system/Database.php';
require_once __DIR__ . '/../../system/Session.php';
require_once __DIR__ . '/../../system/OpenAIService.php';
require_once __DIR__ . '/../../system/N8nAIService.php';

try {
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    
    // Determine which AI service to use based on environment
    $config = \System\Config::getInstance();
    $useN8n = $config->getEnv('USE_N8N_AI') === 'true';
    
    switch ($action) {
        case 'send_message':
            $message = $_POST['message'] ?? '';
            $attachments = $_POST['attachments'] ?? [];
            
            if (empty($message)) {
                throw new Exception('Mensagem é obrigatória');
            }
            
            // Use n8n service if configured, otherwise fallback to OpenAI
            if ($useN8n) {
                $aiService = new \System\N8nAIService();
            } else {
                $aiService = new \System\OpenAIService();
            }
            
            $response = $aiService->processMessage($message, $attachments);
            
            echo json_encode([
                'success' => true,
                'response' => $response
            ]);
            break;
            
        case 'execute_operation':
            $operation = json_decode($_POST['operation'] ?? '{}', true);
            
            if (empty($operation)) {
                throw new Exception('Operação é obrigatória');
            }
            
            $aiService = new \System\OpenAIService();
            $result = $aiService->executeOperation($operation);
            
            echo json_encode([
                'success' => true,
                'result' => $result
            ]);
            break;
            
        case 'upload_file':
            $uploadedFile = $_FILES['file'] ?? null;
            
            if (!$uploadedFile || $uploadedFile['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('Erro no upload do arquivo');
            }
            
            // Validate file type
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
            $fileType = mime_content_type($uploadedFile['tmp_name']);
            
            if (!in_array($fileType, $allowedTypes)) {
                throw new Exception('Tipo de arquivo não suportado');
            }
            
            // Validate file size (max 10MB)
            if ($uploadedFile['size'] > 10 * 1024 * 1024) {
                throw new Exception('Arquivo muito grande (máximo 10MB)');
            }
            
            // Create uploads directory if not exists
            $uploadDir = __DIR__ . '/../../uploads/ai_chat/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            // Generate unique filename
            $extension = pathinfo($uploadedFile['name'], PATHINFO_EXTENSION);
            $filename = uniqid() . '_' . time() . '.' . $extension;
            $filePath = $uploadDir . $filename;
            
            // Move uploaded file
            if (!move_uploaded_file($uploadedFile['tmp_name'], $filePath)) {
                throw new Exception('Erro ao salvar arquivo');
            }
            
            // Determine file type for processing
            $type = 'unknown';
            if (strpos($fileType, 'image/') === 0) {
                $type = 'image';
            } elseif ($fileType === 'application/pdf') {
                $type = 'pdf';
            } elseif (in_array($fileType, ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])) {
                $type = 'spreadsheet';
            }
            
            echo json_encode([
                'success' => true,
                'file' => [
                    'name' => $uploadedFile['name'],
                    'path' => $filePath,
                    'type' => $type,
                    'size' => $uploadedFile['size']
                ]
            ]);
            break;
            
        case 'get_context':
            $aiService = new \System\OpenAIService();
            
            // Use reflection to access private method (not ideal, but works for demo)
            $reflection = new ReflectionClass($aiService);
            $method = $reflection->getMethod('getSystemContext');
            $method->setAccessible(true);
            $context = $method->invoke($aiService);
            
            echo json_encode([
                'success' => true,
                'context' => json_decode($context, true)
            ]);
            break;
            
        case 'search_products':
            $query = $_GET['q'] ?? '';
            
            if (empty($query)) {
                throw new Exception('Query de busca é obrigatória');
            }
            
            $db = \System\Database::getInstance();
            $session = \System\Session::getInstance();
            $tenantId = $session->getTenantId() ?? 1;
            $filialId = $session->getFilialId() ?? 1;
            
            $products = $db->fetchAll(
                "SELECT p.id, p.nome, p.preco_normal, p.descricao, c.nome as categoria 
                 FROM produtos p 
                 LEFT JOIN categorias c ON p.categoria_id = c.id 
                 WHERE p.tenant_id = ? AND p.filial_id = ? 
                 AND (LOWER(p.nome) LIKE LOWER(?) OR LOWER(p.descricao) LIKE LOWER(?)) 
                 ORDER BY p.nome 
                 LIMIT 20",
                [$tenantId, $filialId, "%{$query}%", "%{$query}%"]
            );
            
            echo json_encode([
                'success' => true,
                'products' => $products
            ]);
            break;
            
        case 'search_ingredients':
            $query = $_GET['q'] ?? '';
            
            if (empty($query)) {
                throw new Exception('Query de busca é obrigatória');
            }
            
            $db = \System\Database::getInstance();
            $session = \System\Session::getInstance();
            $tenantId = $session->getTenantId() ?? 1;
            $filialId = $session->getFilialId() ?? 1;
            
            $ingredients = $db->fetchAll(
                "SELECT id, nome, tipo, preco_adicional 
                 FROM ingredientes 
                 WHERE tenant_id = ? AND filial_id = ? 
                 AND LOWER(nome) LIKE LOWER(?) 
                 ORDER BY nome 
                 LIMIT 20",
                [$tenantId, $filialId, "%{$query}%"]
            );
            
            echo json_encode([
                'success' => true,
                'ingredients' => $ingredients
            ]);
            break;
            
        case 'search_categories':
            $query = $_GET['q'] ?? '';
            
            if (empty($query)) {
                throw new Exception('Query de busca é obrigatória');
            }
            
            $db = \System\Database::getInstance();
            $session = \System\Session::getInstance();
            $tenantId = $session->getTenantId() ?? 1;
            $filialId = $session->getFilialId() ?? 1;
            
            $categories = $db->fetchAll(
                "SELECT id, nome 
                 FROM categorias 
                 WHERE tenant_id = ? AND filial_id = ? 
                 AND LOWER(nome) LIKE LOWER(?) 
                 ORDER BY nome 
                 LIMIT 20",
                [$tenantId, $filialId, "%{$query}%"]
            );
            
            echo json_encode([
                'success' => true,
                'categories' => $categories
            ]);
            break;
            
        default:
            throw new Exception('Ação não encontrada: ' . $action);
    }
    
} catch (\Exception $e) {
    error_log('AI Chat Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
