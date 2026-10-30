import AppKit
import Vision
import PDFKit

// Offline source transcription. Coordinates are normalized, with a bottom-left origin.
struct Line: Codable { let text: String; let confidence: Float; let bounds: [Double] }
struct Page: Codable { let page: Int; let text: String; let method: String; let lines: [Line] }
func recognize(_ image: CGImage, page: Int) throws -> Page {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.automaticallyDetectsLanguage = true
    request.usesLanguageCorrection = true
    try VNImageRequestHandler(cgImage: image).perform([request])
    let lines = (request.results ?? []).compactMap { observation -> Line? in
        guard let result = observation.topCandidates(1).first else { return nil }
        let r = observation.boundingBox
        return Line(text: result.string, confidence: result.confidence,
                    bounds: [r.origin.x, r.origin.y, r.width, r.height])
    }
    return Page(page: page, text: lines.map(\.text).joined(separator: "\n"), method: "apple-vision", lines: lines)
}
do {
    guard CommandLine.arguments.count == 2 else { throw NSError(domain: "CoquiLearn", code: 1, userInfo: [NSLocalizedDescriptionKey: "Expected one source path."]) }
    let url = URL(fileURLWithPath: CommandLine.arguments[1])
    var output: [Page] = []
    if url.pathExtension.lowercased() == "pdf", let document = PDFDocument(url: url) {
        guard document.pageCount <= 200 else { throw NSError(domain: "CoquiLearn", code: 2, userInfo: [NSLocalizedDescriptionKey: "Preview supports up to 200 pages per PDF."]) }
        for index in 0..<document.pageCount {
            guard let page = document.page(at: index) else { continue }
            if let text = page.string, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                output.append(Page(page: index + 1, text: text, method: "pdf-text", lines: []))
            } else {
                let bounds = page.bounds(for: .mediaBox)
                let scale = min(2, 2200 / max(bounds.width, bounds.height))
                let image = page.thumbnail(of: NSSize(width: bounds.width * scale, height: bounds.height * scale), for: .mediaBox)
                var rect = CGRect(origin: .zero, size: image.size)
                if let cg = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) { output.append(try recognize(cg, page: index + 1)) }
            }
        }
    } else {
        guard let image = NSImage(contentsOf: url) else { throw NSError(domain: "CoquiLearn", code: 3, userInfo: [NSLocalizedDescriptionKey: "Image could not be opened."]) }
        var rect = CGRect(origin: .zero, size: image.size)
        guard let cg = image.cgImage(forProposedRect: &rect, context: nil, hints: nil), cg.width * cg.height <= 40_000_000 else { throw NSError(domain: "CoquiLearn", code: 4, userInfo: [NSLocalizedDescriptionKey: "Image exceeds preview dimensions."]) }
        output.append(try recognize(cg, page: 1))
    }
    FileHandle.standardOutput.write(try JSONEncoder().encode(output))
} catch {
    FileHandle.standardError.write(Data(error.localizedDescription.utf8)); exit(1)
}
