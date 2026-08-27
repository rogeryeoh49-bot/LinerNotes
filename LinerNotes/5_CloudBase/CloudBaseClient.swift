//
//  CloudBaseClient.swift
//  LinerNotes
//
//  Created by Roger Yeoh on 6/20/26.
//

import Foundation

class CloudBaseClient {
    let envId: String
    private(set) var accessToken: String
    let baseUrl: String

    init(envId: String, accessToken: String) {
        self.envId = envId
        self.accessToken = accessToken
        self.baseUrl = "https://\(envId).api.tcloudbasegateway.com"
    }

    /// 更新访问令牌
    ///
    /// - Parameter newToken: 新的访问令牌
    func updateAccessToken(_ newToken: String) {
        self.accessToken = newToken
        print("访问令牌已更新")
    }

    /// 统一的HTTP请求方法
    ///
    /// - Parameters:
    ///   - method: 请求方法 (GET, POST, PUT, PATCH, DELETE)
    ///   - path: API路径 (如 /v1/rdb/rest/table_name)
    ///   - body: 请求体数据
    ///   - customHeaders: 自定义headers
    /// - Returns: 响应数据或nil
    func request<T: Decodable>(
        method: String,
        path: String,
        body: [String: Any]? = nil,
        customHeaders: [String: String] = [:],
        completion: @escaping (T?) -> Void
    ) {
        guard let url = URL(string: "\(baseUrl)\(path)") else {
            print("无效的URL")
            completion(nil)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.uppercased()
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        // 添加自定义headers
        customHeaders.forEach { key, value in
            request.setValue(value, forHTTPHeaderField: key)
        }

        // 设置请求体
        if let body = body {
            do {
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
            } catch {
                print("JSON序列化失败: \(error)")
                completion(nil)
                return
            }
        }

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("请求失败: \(error.localizedDescription)")
                completion(nil)
                return
            }

            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                print("请求失败: \((response as? HTTPURLResponse)?.statusCode ?? -1)")
                completion(nil)
                return
            }

            guard let data = data else {
                // 如果响应为空，返回true表示成功
                if T.self == Bool.self {
                    completion(true as? T)
                } else {
                    completion(nil)
                }
                return
            }

            do {
                let decoder = JSONDecoder()
                let result = try decoder.decode(T.self, from: data)
                completion(result)
            } catch {
                // 尝试作为Any解码
                if let json = try? JSONSerialization.jsonObject(with: data) as? T {
                    completion(json)
                } else {
                    print("JSON解析失败: \(error)")
                    completion(nil)
                }
            }
        }

        task.resume()
    }

    /// 同步版本（使用 async/await）
    @available(iOS 13.0, *)
    func request<T: Decodable>(
        method: String,
        path: String,
        body: [String: Any]? = nil,
        customHeaders: [String: String] = [:]
    ) async -> T? {
        await withCheckedContinuation { continuation in
            request(method: method, path: path, body: body, customHeaders: customHeaders) { (result: T?) in
                continuation.resume(returning: result)
            }
        }
    }
}

// 配置文件或初始化时创建实例
// let cloudbase = CloudBaseClient(
//     envId: "your-env-id",
//     accessToken: "your-access-token"
// )
