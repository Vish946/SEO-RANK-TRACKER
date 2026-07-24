import Analysis from "../models/Analysis.js";
import { analyzeSeoData } from "../services/geminiService.js";
import { scrapeUrl } from "../services/scraperService.js";

// ===============================
// Analyze URL
// ===============================
export const analyzeUrl = async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "URL is required",
            });
        }

        let validUrl;

        try {
            validUrl = new URL(
                url.startsWith("http") ? url : `https://${url}`
            );
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: "Invalid URL format",
            });
        }

        // Create analysis entry
        const analysis = await Analysis.create({
            userId: req.userId,
            url: validUrl.href,
            status: "processing",
        });

        // Immediately respond
        res.status(200).json({
            success: true,
            message: "Analysis started",
            analysisId: analysis._id,
        });

        // ===============================
        // Background Processing
        // ===============================
        try {
            // Step 1: Scrape Website
            const scrapeResult = await scrapeUrl(validUrl.href);

            if (!scrapeResult.success) {
                analysis.status = "failed";
                await analysis.save();
                return;
            }

            // Step 2: AI Analysis
            const aiResult = await analyzeSeoData(scrapeResult.data);

            if (!aiResult.success) {
                analysis.status = "failed";
                await analysis.save();
                return;
            }

            // Step 3: Save Results
            analysis.overallScore = aiResult.data.overallScore || 0;
            analysis.categories = aiResult.data.categories || {};

            analysis.metaData = scrapeResult.data.metaData || {};
            analysis.headings = scrapeResult.data.headings || {};
            analysis.links = scrapeResult.data.links || {};
            analysis.images = scrapeResult.data.images || {};

            analysis.keywords = aiResult.data.keywords || [];
            analysis.issues = aiResult.data.issues || [];

            analysis.loadTime = scrapeResult.data.loadTime || 0;
            analysis.pageSize = scrapeResult.data.pageSize || 0;
            analysis.wordCount = scrapeResult.data.wordCount || 0;

            analysis.status = "completed";

            await analysis.save();

            console.log(`Analysis completed: ${analysis._id}`);
        } catch (bgError) {
            console.error("Background analysis error:", bgError);

            try {
                analysis.status = "failed";
                await analysis.save();
            } catch (saveError) {
                console.error("Failed to update failed status:", saveError);
            }
        }
    } catch (error) {
        console.error("Analyze URL error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: error.message || "Server error",
            });
        }
    }
};

// ===============================
// Get Single Analysis
// ===============================
export const getAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findOne({
            _id: req.params.id,
            userId: req.userId,
        });

        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: "Analysis not found",
            });
        }

        res.status(200).json({
            success: true,
            analysis,
        });
    } catch (error) {
        console.error("Get analysis error:", error);

        res.status(500).json({
            success: false,
            message: error.message || "Server error",
        });
    }
};

// ===============================
// Get All Analyses
// ===============================
export const getAnalyses = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const analyses = await Analysis.find({
            userId: req.userId,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("-issues -keywords");

        const total = await Analysis.countDocuments({
            userId: req.userId,
        });

        res.status(200).json({
            success: true,
            analyses,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get analyses error:", error);

        res.status(500).json({
            success: false,
            message: error.message || "Server error",
        });
    }
};

// ===============================
// Delete Analysis
// ===============================
export const deleteAnalysis = async (req, res) => {
    try {
        const deleted = await Analysis.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId,
        });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Analysis not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Analysis deleted successfully",
        });
    } catch (error) {
        console.error("Delete analysis error:", error);

        res.status(500).json({
            success: false,
            message: error.message || "Server error",
        });
    }
};