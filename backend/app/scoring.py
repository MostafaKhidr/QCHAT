"""Q-CHAT-10 scoring logic."""

# Scoring rules for each question
# Questions 1-9: Score 1 point if C, D, or E is selected
# Question 10: Score 1 point if A, B, or C is selected (REVERSED)
SCORING_RULES = {
    1: ["C", "D", "E"],
    2: ["C", "D", "E"],
    3: ["C", "D", "E"],
    4: ["C", "D", "E"],
    5: ["C", "D", "E"],
    6: ["C", "D", "E"],
    7: ["C", "D", "E"],
    8: ["C", "D", "E"],
    9: ["C", "D", "E"],
    10: ["A", "B", "C"],  # REVERSED SCORING
}

# Referral threshold
REFERRAL_THRESHOLD = 3  # Score > 3 means referral recommended


def calculate_point(question_number: int, selected_option: str) -> bool:
    """
    Calculate if a point should be scored for this answer.

    Args:
        question_number: Question number (1-10)
        selected_option: Selected option (A, B, C, D, E)

    Returns:
        bool: True if point should be scored, False otherwise
    """
    if question_number not in SCORING_RULES:
        return False

    return selected_option in SCORING_RULES[question_number]


def calculate_total_score(answers: list[dict]) -> int:
    """
    Calculate total score from all answers.

    Args:
        answers: List of answer dicts with 'question_number' and 'selected_option'

    Returns:
        int: Total score (0-10)
    """
    score = 0
    for answer in answers:
        q_num = answer.get("question_number")
        option = answer.get("selected_option")
        if q_num and option and calculate_point(q_num, option):
            score += 1
    return score


def assess_risk(total_score: int) -> dict:
    """
    Assess risk level based on total score.

    Args:
        total_score: Total score (0-10)

    Returns:
        dict: Risk assessment with recommendations
    """
    recommend_referral = total_score > REFERRAL_THRESHOLD
    risk_level = "high" if recommend_referral else "low"

    if recommend_referral:
        recommendations = [
            "Your child's score suggests a need for further evaluation.",
            "We recommend scheduling an appointment with a pediatrician or developmental specialist.",
            "Early intervention can make a significant difference in outcomes.",
            "Please bring this report to your healthcare provider.",
            "Consider asking for a referral to a multidisciplinary assessment team.",
        ]
    else:
        recommendations = [
            "Your child's score is within the typical range.",
            "Continue to monitor your child's development.",
            "If you have ongoing concerns, discuss them with your pediatrician.",
            "Regular developmental checkups are important for all children.",
        ]

    return {
        "total_score": total_score,
        "max_score": 10,
        "threshold": REFERRAL_THRESHOLD,
        "recommend_referral": recommend_referral,
        "risk_level": risk_level,
        "recommendations": recommendations,
    }


def get_recommendations_bilingual() -> dict:
    """Get recommendations in both English and Arabic."""
    return {
        "en": {
            "high": [
                "Your child's score suggests a need for further evaluation.",
                "We recommend scheduling an appointment with a pediatrician or developmental specialist.",
                "Early intervention can make a significant difference in outcomes.",
                "Please bring this report to your healthcare provider.",
                "Consider asking for a referral to a multidisciplinary assessment team.",
            ],
            "low": [
                "Your child's score is within the typical range.",
                "Continue to monitor your child's development.",
                "If you have ongoing concerns, discuss them with your pediatrician.",
                "Regular developmental checkups are important for all children.",
            ],
        },
        "ar": {
            "high": [
                "تشير درجة طفلك إلى الحاجة لمزيد من التقييم.",
                "نوصي بتحديد موعد مع طبيب أطفال أو أخصائي تطور.",
                "التدخل المبكر يمكن أن يحدث فرقاً كبيراً في النتائج.",
                "يرجى إحضار هذا التقرير إلى مقدم الرعاية الصحية الخاص بك.",
                "فكر في طلب إحالة إلى فريق تقييم متعدد التخصصات.",
            ],
            "low": [
                "درجة طفلك ضمن النطاق الطبيعي.",
                "استمر في مراقبة تطور طفلك.",
                "إذا كانت لديك مخاوف مستمرة، ناقشها مع طبيب الأطفال.",
                "الفحوصات التطورية المنتظمة مهمة لجميع الأطفال.",
            ],
        },
    }
