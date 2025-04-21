document.addEventListener('DOMContentLoaded', () => {
  const feedbackBtn = document.getElementById('feedback-button');
  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', () => {
      window.open('https://docs.google.com/forms/d/e/1FAIpQLSc_30HENJvag7CbPtiaPaISqXWY7Tc6mUqJ08BsY1LS794bmg/viewform?usp=dialog', '_blank');
    });
  }
});
